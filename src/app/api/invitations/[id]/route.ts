// ============================================================================
// API /api/invitations/[id]  (PATCH)
// Actualiza estado de publicación y/o conservación de una invitación.
// Valida propiedad y, al publicar, respeta el cupo del plan.
//   body: { status?: "published" | "draft"; retain?: boolean }
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  getUserEntitlements,
  countActiveInvitationsExcluding,
} from "@/lib/entitlements";
import { retainInvitation } from "@/lib/firestore";
import { LogHelper } from "@/lib/logging";
import { RETENTION_GRACE_MS } from "@/lib/plans";
import type { Invitation } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const idToken = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!idToken) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  let body: { status?: "published" | "draft"; retain?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const invRef = adminDb.collection("invitations").doc(params.id);
  const snap = await invRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }
  const inv = snap.data() as Invitation;

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const isAdmin = (userSnap.data() as any)?.role === "admin";
  if (inv.ownerUid !== uid && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Conservar / dejar de conservar.
  if (typeof body.retain === "boolean") {
    if (body.retain) {
      await retainInvitation(params.id, uid);
    } else {
      const patch: Record<string, unknown> = { retain: false };
      if (inv.status !== "published" && inv.unpublishedReason === "event_expired") {
        patch.deleteAfter = (inv.unpublishedAt ?? Date.now()) + RETENTION_GRACE_MS;
      }
      await invRef.update(patch);
    }
  }

  // Cambiar estado de publicación.
  if (body.status === "published") {
    const entitlements = await getUserEntitlements(uid);
    if (entitlements && entitlements.quota !== "unlimited") {
      const activeOthers = await countActiveInvitationsExcluding(uid, params.id);
      if (activeOthers >= entitlements.quota) {
        return NextResponse.json(
          { error: "Alcanzaste el límite de invitaciones activas de tu plan." },
          { status: 409 }
        );
      }
    }
    await invRef.update({ status: "published" });
    await LogHelper.invitationPublished(params.id, uid);
  } else if (body.status === "draft") {
    // Despublicación manual: no programa borrado (solo la vigencia lo hace).
    await invRef.update({
      status: "draft",
      unpublishedAt: Date.now(),
      unpublishedReason: "manual",
    });
    await LogHelper.invitationUnpublished(params.id, "manual", uid);
  }

  return NextResponse.json({ ok: true });
}
