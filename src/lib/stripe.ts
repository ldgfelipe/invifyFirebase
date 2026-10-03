// ============================================================================
// STRIPE (servidor)
// Cliente configurado con la clave secreta.
// Prioridad: /paymentConfig (Firestore PRIVADO, solo admin) > env vars.
// Soporta modo test y live por separado.
// El toggle de modo (stripeTestMode) sigue en /site/config porque es publico.
// FIX: cache con TTL corto (30s) para que el toggle test/live en admin aplique
// sin reiniciar la app, en vez de cache infinito que ignoraba cambios.
// ============================================================================
import Stripe from "stripe";
import { adminDb } from "./firebase/admin";

let cachedInstance: Stripe | null = null;
let cachedWebhook: string = "";
let cachedMode: "test" | "live" = "test";
let cachedAt = 0;
const CACHE_TTL = 30_000; // 30s

/** Credenciales privadas de Stripe. Nunca leer de /site/config. */
async function loadStripeSecrets(mode: "test" | "live") {
  try {
    const snap = await adminDb.collection("paymentConfig").doc("default").get();
    if (!snap.exists) return { secretKey: undefined, webhook: undefined };
    const d = snap.data() as Record<string, any>;
    const secretKey = mode === "test" ? d.stripeTestSecretKey : d.stripeLiveSecretKey;
    const webhook = mode === "test" ? d.stripeTestWebhookSecret : d.stripeLiveWebhookSecret;
    return { secretKey, webhook };
  } catch {
    return { secretKey: undefined, webhook: undefined };
  }
}

/** Toggle de modo, publico. */
async function loadTestModeFlag(): Promise<boolean> {
  try {
    const snap = await adminDb.collection("site").doc("config").get();
    if (!snap.exists) return true;
    const d = snap.data() as any;
    return d.stripeTestMode !== false;
  } catch {
    return true;
  }
}

async function resolveStripeConfig(requestedMode?: "test" | "live"): Promise<{ stripe: Stripe; webhookSecret: string; mode: "test" | "live" }> {
  const now = Date.now();
  const needsRefresh = !cachedInstance || now - cachedAt > CACHE_TTL;

  // Si se pide un modo específico distinto al cacheado, siempre refrescar
  const mustForce = requestedMode && requestedMode !== cachedMode;

  if (!needsRefresh && !mustForce) {
    return { stripe: cachedInstance!, webhookSecret: cachedWebhook, mode: cachedMode };
  }

  // Modo efectivo: el pedido, o el toggle global
  const effectiveMode: "test" | "live" = requestedMode ?? ((await loadTestModeFlag()) ? "test" : "live");

  // 1. /paymentConfig (Firestore privado, solo admin)
  const { secretKey, webhook } = await loadStripeSecrets(effectiveMode);
  if (secretKey) {
    const inst = new Stripe(secretKey, { apiVersion: "2023-10-16", typescript: true });
    if (!requestedMode || requestedMode === effectiveMode) {
      cachedInstance = inst;
      cachedWebhook = webhook ?? "";
      cachedMode = effectiveMode;
      cachedAt = now;
    }
    console.log(`[Stripe] Config loaded from paymentConfig (${effectiveMode})${mustForce ? " [forced]" : ""}`);
    return { stripe: inst, webhookSecret: webhook ?? "", mode: effectiveMode };
  }

  // 2. Fallback a env vars (solo si el modo pedido coincide con el prefijo)
  const secret = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
  const envIsLive = secret.startsWith("sk_live");
  const envMode: "test" | "live" = envIsLive ? "live" : "test";
  // Si el env no coincide con el modo pedido, igual devolvemos pero warn
  if (requestedMode && requestedMode !== envMode) {
    console.warn(`[Stripe] env STRIPE_SECRET_KEY es ${envMode} pero se pidió ${requestedMode}; usando env igualmente`);
  }
  const inst = new Stripe(secret, { apiVersion: "2023-10-16", typescript: true });
  const envWebhook = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!requestedMode) {
    cachedInstance = inst;
    cachedWebhook = envWebhook;
    cachedMode = effectiveMode;
    cachedAt = now;
    console.log(`[Stripe] Config loaded from env vars (${effectiveMode})`);
  }
  return { stripe: inst, webhookSecret: envWebhook, mode: effectiveMode };
}

export async function getStripe(forceMode?: "test" | "live") {
  const { stripe } = await resolveStripeConfig(forceMode);
  return stripe;
}

export async function getStripeWebhookSecret(mode?: "test" | "live") {
  const { webhookSecret } = await resolveStripeConfig(mode);
  return webhookSecret;
}

export function getStripeMode(): "test" | "live" {
  return cachedMode;
}

export async function getStripeModeAsync(): Promise<"test" | "live"> {
  const { mode } = await resolveStripeConfig();
  return mode;
}

// Para compatibilidad con código existente (síncrono) - evita usar en nuevo código
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
