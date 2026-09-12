// ============================================================================
// API /api/stripe/webhook - Confirma pagos de Stripe (firma verificada).
// Soporta Checkout Session (redirect) y PaymentIntent (embedded).
// Logs de auditoría integrados.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase/admin";
import { cloneTemplateToInvitation } from "@/lib/firestore";
import { generateUniqueSlug } from "@/lib/slug";
import { log, LogHelper } from "@/lib/logging";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = await getStripeWebhookSecret();
  if (!sig || !webhookSecret) {
    await LogHelper.webhookFailed("unknown", "missing-secret", "Missing signature or secret");
    return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = await getStripe();
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    await LogHelper.webhookReceived(event.type, event.id);
  } catch (err: any) {
    await LogHelper.webhookFailed("unknown", "invalid-signature", err.message);
    return NextResponse.json({ error: `Firma inválida: ${err.message}` }, { status: 400 });
  }

  try {
    // --- Checkout Session (flujo redirect clásico) ---
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { orderId, uid, templateId } = session.metadata ?? {};
      await LogHelper.webhookProcessed(event.type, event.id, orderId);
      if (orderId && uid && templateId) {
        await procesarPagoExitoso({ orderId, uid, templateId });
      } else {
        await log({
          action: "webhook.failed",
          targetId: event.id,
          targetType: "webhook",
          severity: "error",
          metadata: { eventType: event.type, reason: "missing-metadata" },
          description: "checkout.session.completed sin metadata completa",
        });
      }
    }

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      await LogHelper.webhookProcessed(event.type, event.id, orderId);
      if (orderId) {
        await adminDb.collection("orders").doc(orderId).update({ status: "failed" });
        await LogHelper.orderFailed(orderId, event.type);
      }
    }

    // --- PaymentIntent (flujo embedded/PaymentElement) ---
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const { orderId, uid, templateId } = pi.metadata ?? {};
      await LogHelper.webhookProcessed(event.type, event.id, orderId);
      if (orderId && uid && templateId) {
        await procesarPagoExitoso({ orderId, uid, templateId });
        await adminDb.collection("orders").doc(orderId).update({ status: "paid", stripePaymentIntentId: pi.id });
        await LogHelper.orderPaid(orderId, "", uid); // invitationId se llena en procesarPagoExitoso
      } else {
        await log({
          action: "webhook.failed",
          targetId: event.id,
          targetType: "webhook",
          severity: "error",
          metadata: { eventType: event.type, reason: "missing-metadata" },
          description: "payment_intent.succeeded sin metadata completa",
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      const orderId = pi.metadata?.orderId;
      await LogHelper.webhookProcessed(event.type, event.id, orderId);
      if (orderId) {
        await adminDb.collection("orders").doc(orderId).update({ status: "failed", stripePaymentIntentId: pi.id });
        await LogHelper.orderFailed(orderId, "payment_intent.payment_failed");
      }
    }

    await log({
      action: "webhook.processed",
      targetId: event.id,
      targetType: "webhook",
      metadata: { eventType: event.type },
      description: `Evento ${event.type} procesado correctamente`,
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    await LogHelper.webhookFailed(event.type, event.id, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function procesarPagoExitoso(params: {
  orderId: string;
  uid: string;
  templateId: string;
}) {
  const orderSnap = await adminDb.collection("orders").doc(params.orderId).get();
  if (orderSnap.exists && orderSnap.data()?.status === "paid") {
    await log({
      action: "webhook.processed",
      targetId: params.orderId,
      targetType: "order",
      metadata: { reason: "duplicate" },
      description: "Order ya procesado (duplicado)",
    });
    return;
  }

  const tplSnap = await adminDb.collection("templates").doc(params.templateId).get();
  if (!tplSnap.exists) {
    await log({
      action: "webhook.failed",
      targetId: params.orderId,
      targetType: "order",
      severity: "error",
      metadata: { reason: "template-not-found", templateId: params.templateId },
      description: "Plantilla no existe en Firestore",
    });
    throw new Error("Plantilla no encontrada");
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
    ownerUid: params.uid,
    templateId: params.templateId,
    slug,
    planId: "",
    orderId: params.orderId,
  });

  // NUEVO: Actualizar tier a premium
  await adminDb.collection("invitations").doc(invitationId).update({
    tier: "premium",
    tierUpdatedAt: Date.now(),
  });

  await adminDb.collection("orders").doc(params.orderId).update({
    status: "paid",
    invitationId,
  });

  // Logs de auditoría
  await LogHelper.orderPaid(params.orderId, invitationId, params.uid);
  await LogHelper.invitationCloned(invitationId, params.templateId, params.uid);
}