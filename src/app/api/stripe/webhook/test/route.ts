// ============================================================================
// API /api/stripe/webhook/test - Endpoint de diagnóstico para procesar
// manualmente un orderId (simula payment_intent.succeeded).
// Útil para probar sin configurar webhook en Stripe Dashboard.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { cloneTemplateToInvitation } from "@/lib/firestore";
import { generateUniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Verifica autenticación (solo el dueño del order o admin)
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "");
    if (!idToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    }

    // Lee el order
    const orderSnap = await adminDb.collection("orders").doc(orderId).get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order no encontrado" }, { status: 404 });
    }
    const order = orderSnap.data() as any;

    // Verifica ownership
    if (order.uid !== uid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (order.status === "paid") {
      return NextResponse.json({ message: "Ya procesado", invitationId: order.invitationId });
    }

    const templateId = order.templateId;
    if (!templateId) {
      return NextResponse.json({ error: "Order sin templateId" }, { status: 400 });
    }

    // Procesa igual que el webhook
    // Las plantillas generadas con IA se guardan en /demoTemplates (colección
    // de demos del cliente), no en /templates. El webhook de prueba procesa la
    // compra y debe poder clonarla igual: busca en templates y, si no existe,
    // cae aditivamente a demoTemplates del MISMO dueño (sin exponer demos ajenas).
    let tplSnap = await adminDb.collection("templates").doc(templateId).get();
    if (!tplSnap.exists) {
      const demoSnap = await adminDb
        .collection("demoTemplates")
        .where("id", "==", templateId)
        .where("uid", "==", uid)
        .limit(1)
        .get();
      if (!demoSnap.empty) tplSnap = demoSnap.docs[0];
    }
    if (!tplSnap || !tplSnap.exists) {
      return NextResponse.json({ error: "Plantilla no existe" }, { status: 404 });
    }
    const tplName = (tplSnap.data() as any).name ?? "mi-invitacion";

    const slug = await generateUniqueSlug(tplName, async (candidate) => {
      const snap = await adminDb
        .collection("invitations")
        .where("slug", "==", candidate)
        .limit(1)
        .get();
      return !snap.empty;
    });

    const invitationId = await cloneTemplateToInvitation({
      ownerUid: uid,
      templateId,
      slug,
      planId: "",
      orderId,
    });

    await adminDb.collection("orders").doc(orderId).update({
      status: "paid",
      invitationId,
    });

    return NextResponse.json({ success: true, invitationId, slug });
  } catch (err: any) {
    console.error("[WEBHOOK TEST ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}