// ============================================================================
// API /api/cron/expire-invitations
// Barrido programado: despublica invitaciones cuya vigencia terminó
// (fecha del evento + 1 día). Protegido con el secreto CRON_SECRET.
//
// Configura un scheduler (Cloud Scheduler, cron-job.org, Vercel Cron, etc.)
// que haga GET/POST diario a esta URL con:
//   Authorization: Bearer <CRON_SECRET>   (o ?secret=<CRON_SECRET>)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { isInvitationExpired } from "@/lib/invitationValidity";
import { unpublishInvitation, deleteInvitationDeep } from "@/lib/firestore";
import type { Invitation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const qs = req.nextUrl.searchParams.get("secret") ?? "";
  return bearer === secret || qs === secret;
}

async function run(req: NextRequest): Promise<Response> {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en el entorno" },
      { status: 500 }
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const snap = await adminDb
    .collection("invitations")
    .where("status", "==", "published")
    .get();

  const now = Date.now();
  let expired = 0;
  let deleted = 0;
  const errors: string[] = [];

  // 1) Despublica las que superaron su vigencia (evento + 1 día).
  for (const docSnap of snap.docs) {
    const inv = docSnap.data() as Invitation;
    if (!isInvitationExpired(inv, now)) continue;
    try {
      await unpublishInvitation(docSnap.id, "event_expired");
      expired++;
    } catch (err: any) {
      errors.push(`${docSnap.id}: ${err.message}`);
    }
  }

  // 2) Borra las despublicadas cuya gracia terminó y no fueron conservadas.
  const purgeSnap = await adminDb
    .collection("invitations")
    .where("deleteAfter", "<=", now)
    .get();

  for (const docSnap of purgeSnap.docs) {
    const inv = docSnap.data() as Invitation;
    if (inv.retain) continue; // el cliente la conserva para un producto futuro
    try {
      await deleteInvitationDeep(docSnap.id, "retention_expired");
      deleted++;
    } catch (err: any) {
      errors.push(`${docSnap.id}: ${err.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    checked: snap.size,
    expired,
    deleted,
    ...(errors.length ? { errors } : {}),
  });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
