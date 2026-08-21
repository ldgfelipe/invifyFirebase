// ============================================================================
// API /api/view - Registra una apertura de invitación (vistas únicas/totales).
// Se invoca desde el cliente para no penalizar el SSR con escrituras.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const { invitationId, unique } = await req.json().catch(() => ({}) as any);
  if (!invitationId || typeof invitationId !== "string") {
    return NextResponse.json({ error: "invitationId requerido" }, { status: 400 });
  }
  // Best-effort: requiere Admin SDK (cuenta de servicio). Si no está configurado
  // (aún), no rompe la experiencia del invitado.
  try {
    const ref = adminDb.collection("invitations").doc(invitationId);
    await ref.update({
      "stats.views": FieldValue.increment(1),
      ...(unique ? { "stats.uniqueViews": FieldValue.increment(1) } : {}),
    });
  } catch {
    // Sin credenciales de admin: se ignora el conteo (no crítico).
  }
  return NextResponse.json({ ok: true });
}
