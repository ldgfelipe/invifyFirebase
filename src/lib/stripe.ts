// ============================================================================
// STRIPE (servidor)
// Cliente configurado con la clave secreta. Prioridad: SiteSettings (Firestore) > env vars.
// Soporta modo test y live por separado.
// ============================================================================
import Stripe from "stripe";
import { adminDb } from "./firebase/admin";

let stripeInstance: Stripe | null = null;
let webhookSecret: string = "";
let currentMode: "test" | "live" = "test";

async function loadStripeConfig() {
  if (stripeInstance) return;

  // 1. Intenta leer de SiteSettings (Firestore)
  try {
    const snap = await adminDb.collection("site").doc("config").get();
    if (snap.exists) {
      const data = snap.data() as any;
      const isTest = data.stripeTestMode !== false; // default test
      currentMode = isTest ? "test" : "live";

      const secretKey = isTest ? data.stripeTestSecretKey : data.stripeLiveSecretKey;
      const webhook = isTest ? data.stripeTestWebhookSecret : data.stripeLiveWebhookSecret;

      if (secretKey) {
        stripeInstance = new Stripe(secretKey, {
          apiVersion: "2023-10-16",
          typescript: true,
        });
        webhookSecret = webhook ?? "";
        console.log(`[Stripe] Config loaded from SiteSettings (${currentMode})`);
        return;
      }
    }
  } catch (err) {
    console.warn("[Stripe] Failed to load from SiteSettings:", err);
  }

  // 2. Fallback a env vars
  const secret = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
  stripeInstance = new Stripe(secret, {
    apiVersion: "2023-10-16",
    typescript: true,
  });
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  currentMode = secret.startsWith("sk_live") ? "live" : "test";
  console.log(`[Stripe] Config loaded from env vars (${currentMode})`);
}

export async function getStripe(forceMode?: "test" | "live") {
  await loadStripeConfig();
  
  // Si se fuerza un modo diferente al actual, crear nueva instancia
  if (forceMode && forceMode !== currentMode) {
    const snap = await adminDb.collection("site").doc("config").get();
    if (snap.exists) {
      const data = snap.data() as any;
      const secretKey = forceMode === "test" ? data.stripeTestSecretKey : data.stripeLiveSecretKey;
      if (secretKey) {
        return new Stripe(secretKey, {
          apiVersion: "2023-10-16",
          typescript: true,
        });
      }
    }
    // Fallback a env vars
    const secret = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
    return new Stripe(secret, {
      apiVersion: "2023-10-16",
      typescript: true,
    });
  }
  
  return stripeInstance!;
}

export async function getStripeWebhookSecret() {
  await loadStripeConfig();
  return webhookSecret;
}

export function getStripeMode(): "test" | "live" {
  return currentMode;
}

// Para compatibilidad con código existente (síncrono)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";