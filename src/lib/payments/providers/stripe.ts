// ============================================================================
// PAYMENTS - Provider: Stripe
// Pagos únicos (one_time): NO requieren Productos/Precios de Stripe.
//   - Embedded: PaymentIntent con amount + currency.
//   - Hosted: Checkout Session con line_items usando price_data inline.
// Suscripciones: siguen necesitando un Price (se crea vía sync admin).
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

  // ---- Suscripción hosted (Checkout Session con price_id del plan) ---------
  const priceId =
    ctx.mode === "live" ? ctx.plan.stripePriceIdLive! : ctx.plan.stripePriceIdTest!;
  if (!priceId) {
    throw new Error(`El plan ${ctx.plan.name} no tiene Price Stripe ${ctx.mode} para suscripción`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: ctx.email || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${ctx.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
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