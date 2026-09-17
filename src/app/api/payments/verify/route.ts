// ============================================================================
// API /api/payments/verify - Verifica un pago al regresar del redirect
// (PayPal return_url, Mercado Pago back_urls). Confirma con el proveedor y
// procesa el éxito si aplica. El dashboard lo llama al cargar con ?paypal_order
// o ?mp_order.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { processPaymentSuccess } from "@/lib/payments/success";
import { paypalCaptureOrder } from "@/lib/payments/providers/paypal";
import { mercadopagoGetPayment } from "@/lib/payments/providers/mercadopago";
import { LogHelper, log } from "@/lib/logging";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  const { provider, orderId, mode = "test" } = await req.json();
  if (!provider || !orderId) {
    return NextResponse.json({ error: "provider y orderId requeridos" }, { status: 400 });
  }

  const orderRef = adminDb.collection("orders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  const order = snap.data() as any;
  if (order.uid !== uid) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (order.status === "paid" && order.invitationId) {
    return NextResponse.json({ success: true, alreadyPaid: true, invitationId: order.invitationId });
  }

  try {
    if (provider === "paypal") {
      const paypalOrderId = order.providerRef ?? "";
      if (!paypalOrderId) {
        return NextResponse.json({ error: "Orden PayPal no asociada" }, { status: 400 });
      }
      const capture = await paypalCaptureOrder(paypalOrderId, mode as "test" | "live");
      if (order.templateId && order.uid) {
        await processPaymentSuccess({
          orderId,
          uid: order.uid,
          templateId: order.templateId,
          provider: "paypal",
          providerRef: capture.captureId,
        });
      }
      return NextResponse.json({ success: true, invitationId: order.invitationId });
    }

    if (provider === "mercadopago") {
      const paymentId = order.providerRef ?? "";
      if (!paymentId) {
        return NextResponse.json({ error: "Pago MP no asociado" }, { status: 400 });
      }
      const payment = await mercadopagoGetPayment(paymentId, mode as "test" | "live");
      if (payment?.status !== "approved") {
        await orderRef.update({ status: payment?.status === "rejected" ? "failed" : "pending" });
        return NextResponse.json({ success: false, status: payment?.status });
      }
      if (order.templateId && order.uid) {
        await processPaymentSuccess({
          orderId,
          uid: order.uid,
          templateId: order.templateId,
          provider: "mercadopago",
          providerRef: paymentId,
        });
      }
      return NextResponse.json({ success: true, invitationId: order.invitationId });
    }

    return NextResponse.json({ error: `Proveedor no soportado: ${provider}` }, { status: 400 });
  } catch (err: any) {
    await LogHelper.webhookFailed(provider, orderId, err.message);
    await log({
      action: "order.failed",
      targetId: orderId,
      targetType: "order",
      metadata: { provider, error: err.message },
      severity: "error",
      description: `Verificación de ${provider} falló: ${err.message}`,
    });
    return NextResponse.json({ error: err.message, pending: true }, { status: 400 });
  }
}