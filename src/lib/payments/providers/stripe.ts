// ============================================================================
// PAYMENTS - Provider: Stripe
// Pagos únicos (one_time): NO requieren Productos/Precios de Stripe.
//   - Embedded: PaymentIntent con amount + currency.
//   - Hosted: Checkout Session con line_items usando price_data inline.
// Suscripciones: también con price_data inline (monto/moneda del contexto),
// sin depender de un Price sincronizado.
// ============================================================================
import Stripe from "stripe";
import { getProviderCredentials } from "../config";
import type { CheckoutContext, CheckoutResult } from "../types";

export async function stripeCreateCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
  const creds = await getProviderCredentials("stripe", ctx.mode);
  if (!creds.secretKey) throw new Error("No hay credenciales Stripe configuradas");

  const stripe = new Stripe(creds.secretKey, { apiVersion: "2023-10-16" });
  const isSubscription = !!ctx.plan.interval && ctx.plan.interval !== "one_time";

  if (!isSubscription) {
    // ---- Pago único embedded (PaymentIntent) -------------------------------
    const paymentIntent = await stripe.paymentIntents.create({
      amount: ctx.plan.price,
      currency: ctx.plan.currency.toLowerCase(),
      receipt_email: ctx.email || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: ctx.orderId,
        uid: ctx.uid,
        templateId: ctx.templateId ?? "",
      },
    });
    return {
      type: "embedded",
      provider: "stripe",
      clientSecret: paymentIntent.client_secret!,
      publishableKey: creds.publishableKey,
    };
  }

  // ---- Suscripción hosted (Checkout Session con price_data inline) ---------
  // Cobra el monto/moneda del contexto (EN -> USD, ES -> MXN) sin depender de
  // un Price sincronizado. El intervalo viene del plan y Stripe valida.
  const interval = ctx.plan.interval as "day" | "week" | "month" | "year";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: ctx.email || undefined,
    line_items: [
      {
        price_data: {
          currency: ctx.plan.currency.toLowerCase(),
          product_data: { name: ctx.plan.name },
          unit_amount: ctx.plan.price,
          recurring: { interval },
        },
        quantity: 1,
      },
    ],
    success_url: `${ctx.origin}/thanks?provider=stripe&orderId=${ctx.orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ctx.origin}/pricing`,
    metadata: {
      orderId: ctx.orderId,
      uid: ctx.uid,
      templateId: ctx.templateId ?? "",
    },
  });
  return { type: "redirect", provider: "stripe", url: session.url! };
}

/** Verifica y normaliza un evento de webhook de Stripe. */
export async function stripeVerifyWebhook(
  payload: string,
  signature: string,
  mode: "test" | "live"
): Promise<{ event: Stripe.Event } | null> {
  const creds = await getProviderCredentials("stripe", mode);
  if (!creds.webhookSecret || !creds.secretKey) return null;
  const stripe = new Stripe(creds.secretKey, { apiVersion: "2023-10-16" });
  const event = stripe.webhooks.constructEvent(payload, signature, creds.webhookSecret);
  return { event };
}