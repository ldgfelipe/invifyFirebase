// ============================================================================
// API /api/invitations/[id]/change-requests  (POST)
// El dueño solicita permiso a Invify para más cambios cuando agotó los 2
// gratuitos de la publicación. Requiere: publicada + cupo agotado + motivo
// de 10-500 caracteres + sin otra solicitud pendiente.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Invitation } from "@/lib/types";
import { FREE_CHANGES_AFTER_PUBLISH } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
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

  const invRef = adminDb.collection("invitations").doc(params.id);
  const snap = await invRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }
  const inv = snap.data() as Invitation;
  if (inv.ownerUid !== uid) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (inv.status !== "published") {
    return NextResponse.json({ error: "Solo aplica a invitaciones publicadas." }, { status: 400 });
  }
  if ((inv.changesAfterPublish ?? 0) < FREE_CHANGES_AFTER_PUBLISH) {
    return NextResponse.json({ error: "Aún tienes cambios gratuitos disponibles." }, { status: 400 });
  }

  let body: { motivo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  if (motivo.length < 10 || motivo.length > 500) {
    return NextResponse.json(
      { error: "Detalla el motivo de los cambios (10 a 500 caracteres)." },
      { status: 400 }
    );
  }

  const pending = await adminDb
    .collection("changeRequests")
    .where("invitationId", "==", params.id)
    .limit(20)
    .get();
  if (pending.docs.some((d) => (d.data() as any).status === "pending") ) {
    return NextResponse.json(
      { error: "Ya tienes una solicitud pendiente de revisión." },
      { status: 409 }
    );
  }

  const docRef = await adminDb.collection("changeRequests").add({
    invitationId: params.id,
    ownerUid: uid,
    invitationTitle: inv.title,
    slug: inv.slug,
    motivo,
    status: "pending",
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id: docRef.id });
}
