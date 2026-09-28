// ============================================================================
// API /api/admin/change-requests  (POST)
// Invify aprueba o rechaza una solicitud de cambios extra.
//   body: { id: string; decision: "approved" | "rejected" }
// Al aprobar se regalan 2 cambios más (changesAfterPublish = 0).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

async function requireAdmin(req: NextRequest) {
  const raw = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!raw) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(raw);
    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!snap.exists || snap.data()?.role !== "admin") return null;
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { id?: string; decision?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  if (!body.id || (body.decision !== "approved" && body.decision !== "rejected")) {
    return NextResponse.json({ error: "Decisión inválida" }, { status: 400 });
  }

  const ref = adminDb.collection("changeRequests").doc(body.id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }
  const data = snap.data() as any;
  if (data.status !== "pending") {
    return NextResponse.json({ error: "Esta solicitud ya fue atendida." }, { status: 409 });
  }

  await ref.update({
    status: body.decision,
    decidedAt: Date.now(),
    decidedBy: admin.email || admin.uid,
  });

  if (body.decision === "approved") {
    await adminDb.collection("invitations").doc(data.invitationId).update({
      changesAfterPublish: 0,
    });
  }

  return NextResponse.json({ ok: true });
}
