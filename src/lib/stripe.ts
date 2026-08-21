// ============================================================================
// STRIPE (servidor)
// Cliente configurado con la clave secreta. Se usa en API routes de checkout
// y en el webhook.
// ============================================================================
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

export const stripe = new Stripe(stripeSecret ?? "sk_test_placeholder", {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
