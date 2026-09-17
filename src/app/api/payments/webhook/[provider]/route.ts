// ============================================================================
// API /api/payments/webhook/[provider] - Webhook unificado.
// Recibe eventos de Stripe, PayPal o Mercado Pago, los verifica y normaliza,
// y llama processPaymentSuccess (clona plantilla + tier premium + orden paid).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";
import { processPaymentSuccess } from "@/lib/payments/success";
import { stripeVerifyWebhook } from "@/lib/payments/providers/stripe";
import { paypalCaptureOrder } from "@/lib/payments/providers/paypal";
import {
  mercadopagoGetPayment,
  mercadopagoVerifySignature,
} from "@/lib/payments/providers/mercadopago";
import { LogHelper, log } from "@/lib/logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getMode(req: NextRequest): "test" | "live" {
  const m = req.headers.get("x-invify-mode");
  return m === "live" ? "live" : "test";
}

function getHeaderMap(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  req.headers.forEach((v, k) => { out[k.toLowerCase()] = v; });
  return out;
}

// ----------------------------------------------------------------------------
// Stripe
// ----------------------------------------------------------------------------
async function handleStripe(req: NextRequest): Promise<Response> {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  if (!signature) return NextResponse.json({ error: "Sin firma" }, { status: 400 });

  const mode = getMode(req);
  let verified: { event: Stripe.Event } | null = null;
  try {
    verified = await stripeVerifyWebhook(payload, signature, mode);
  } catch (err: any) {
    await LogHelper.webhookFailed("stripe.signature", signature.slice(0, 16), err.message);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }
  if (!verified) {
    return NextResponse.json({ error: "No se pudo verificar webhook" }, { status: 400 });
  }

  const event = verified.event;
  await LogHelper.webhookReceived(event.type, event.id);

  const session = event.data.object as any;
  let orderId: string | undefined;
  let paymentSucceeded = false;

  if (event.type === "checkout.session.completed") {
    orderId = session.metadata?.orderId;
    if (session.payment_status === "paid" || session.mode === "payment") {
      paymentSucceeded = true;
    }
  }
  if (event.type === "payment_intent.succeeded") {
    orderId = session.metadata?.orderId;
    paymentSucceeded = true;
  }
  if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
    orderId = session.metadata?.orderId;
    await LogHelper.webhookProcessed(event.type, event.id, orderId);
    if (orderId) {
      await adminDb.collection("orders").doc(orderId).update({ status: "failed" });
      await LogHelper.orderFailed(orderId, event.type);
    }
    return NextResponse.json({ received: true });
  }

  await LogHelper.webhookProcessed(event.type, event.id, orderId);
  if (orderId && paymentSucceeded) {
    await fulfillStripe(orderId, event.type === "payment_intent.succeeded" ? session.id : session.payment_intent);
  }

  await log({
    action: "webhook.processed",
    targetId: event.id,
    targetType: "webhook",
    metadata: { eventType: event.type },
    description: `Evento ${event.type} procesado por webhook unificado`,
  });
  return NextResponse.json({ received: true });
}

async function fulfillStripe(orderId: string, providerRef?: string) {
  const snap = await adminDb.collection("orders").doc(orderId).get();
  if (!snap.exists) return;
  const order = snap.data() as any;
  if (order.status === "paid") return;
  if (!order.templateId || !order.uid) return;
  await processPaymentSuccess({
    orderId,
    uid: order.uid,
    templateId: order.templateId,
    provider: "stripe",
    providerRef,
  });
}

// ----------------------------------------------------------------------------
// PayPal
// ----------------------------------------------------------------------------
async function handlePayPal(req: NextRequest): Promise<Response> {
  const body = await req.json();
  await LogHelper.webhookReceived(body.event_type ?? "paypal.unknown", body.id ?? "");
  const eventType = body.event_type ?? "";

  // En el flujo return_url capturamos la orden directamente; en webhook
  // procesamos el capture completado.
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = body.resource ?? {};
    const orderId = String(resource.custom_id ?? body.resource?.supplementary_data?.related_ids?.order_id ?? "").replace(
      "order-",
      ""
    );
    const captureId = resource.id ?? "";
    const mode = getMode(req);
    try {
      const capture = await paypalCaptureOrder(String(resource.supplementary_data?.related_ids?.order_id ?? ""), mode);
      await LogHelper.webhookProcessed(eventType, body.id ?? "", orderId);
      if (orderId) {
        const snap = await adminDb.collection("orders").doc(orderId).get();
        if (snap.exists && snap.data()?.status !== "paid" && snap.data()?.templateId) {
          const o = snap.data() as any;
          await processPaymentSuccess({
            orderId,
            uid: o.uid,
            templateId: o.templateId,
            provider: "paypal",
            providerRef: capture.captureId || captureId,
          });
        }
      }
      return NextResponse.json({ received: true });
    } catch (err: any) {
      await LogHelper.webhookFailed(eventType, body.id ?? "", err.message);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  await LogHelper.webhookProcessed(eventType, body.id ?? "", undefined);
  return NextResponse.json({ received: true });
}

// ----------------------------------------------------------------------------
// Mercado Pago
// ----------------------------------------------------------------------------
async function handleMercadoPago(req: NextRequest): Promise<Response> {
  const body = await req.text();
  const mode = getMode(req);
  const headers = getHeaderMap(req);
  const json = (() => {
    try { return JSON.parse(body); } catch { return {}; }
  })();

  const valid = await mercadopagoVerifySignature(headers, body, mode);
  if (!valid) {
    await LogHelper.webhookFailed("mercadopago.signature", headers["x-request-id"] ?? "", "Firma inválida");
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  await LogHelper.webhookReceived(json.type ?? "payment", headers["x-request-id"] ?? "");
  const paymentId = String(json.data?.id ?? "");
  if (!paymentId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  await LogHelper.webhookProcessed(json.type ?? "payment", paymentId, json.data?.orderId);
  const payment = await mercadopagoGetPayment(paymentId, mode);
  if (!payment) {
    return NextResponse.json({ received: true, ignored: "payment-not-found" });
  }

  if (payment.externalReference) {
    const snap = await adminDb.collection("orders").doc(payment.externalReference).get();
    if (snap.exists) {
      const order = snap.data() as any;
      if (payment.status === "approved" && order.status !== "paid" && order.templateId && order.uid) {
        await processPaymentSuccess({
          orderId: payment.externalReference,
          uid: order.uid,
          templateId: order.templateId,
          provider: "mercadopago",
          providerRef: paymentId,
        });
        return NextResponse.json({ received: true });
      }
      if (["rejected", "cancelled", "refunded"].includes(payment.status)) {
        await adminDb.collection("orders").doc(payment.externalReference).update({ status: "failed" });
        await LogHelper.orderFailed(payment.externalReference, payment.status);
      }
    }
  }
  return NextResponse.json({ received: true });
}

// ----------------------------------------------------------------------------
// Dispatcher
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider ?? "";
  try {
    if (provider === "stripe") return await handleStripe(req);
    if (provider === "paypal") return await handlePayPal(req);
    if (provider === "mercadopago") return await handleMercadoPago(req);
    return NextResponse.json({ error: `Proveedor no soportado: ${provider}` }, { status: 400 });
  } catch (err: any) {
    await LogHelper.webhookFailed(provider, "", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}