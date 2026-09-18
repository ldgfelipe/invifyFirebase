// ============================================================================
// STRIPE (servidor)
// Cliente configurado con la clave secreta. Prioridad: SiteSettings (Firestore) > env vars.
// Soporta modo test y live por separado.
// FIX: cache con TTL corto (30s) para que el toggle test/live en admin aplique
// sin reiniciar Cloud Run, en vez de cache infinito que ignoraba cambios.
// ============================================================================
import Stripe from "stripe";
import { adminDb } from "./firebase/admin";

let cachedInstance: Stripe | null = null;
let cachedWebhook: string = "";
let cachedMode: "test" | "live" = "test";
let cachedAt = 0;
const CACHE_TTL = 30_000; // 30s

async function resolveStripeConfig(requestedMode?: "test" | "live"): Promise<{ stripe: Stripe; webhookSecret: string; mode: "test" | "live" }> {
  const now = Date.now();
  const needsRefresh = !cachedInstance || now - cachedAt > CACHE_TTL;

  // Si se pide un modo específico distinto al cacheado, siempre refrescar
  const mustForce = requestedMode && requestedMode !== cachedMode;

  if (!needsRefresh && !mustForce) {
    return { stripe: cachedInstance!, webhookSecret: cachedWebhook, mode: cachedMode };
  }

  // 1. Intenta leer de SiteSettings (Firestore)
  try {
    const snap = await adminDb.collection("site").doc("config").get();
    if (snap.exists) {
      const data = snap.data() as any;
      // Si se fuerza modo, úsalo; si no, deduce del toggle global
      const effectiveMode: "test" | "live" = requestedMode ?? (data.stripeTestMode !== false ? "test" : "live");
      const secretKey = effectiveMode === "test" ? data.stripeTestSecretKey : data.stripeLiveSecretKey;
      const webhook = effectiveMode === "test" ? data.stripeTestWebhookSecret : data.stripeLiveWebhookSecret;
      if (secretKey) {
        const inst = new Stripe(secretKey, { apiVersion: "2023-10-16", typescript: true });
        // Solo cachea si es el modo global (no forzado) o si el forzado coincide
        if (!requestedMode || requestedMode === effectiveMode) {
          cachedInstance = inst;
          cachedWebhook = webhook ?? "";
          cachedMode = effectiveMode;
          cachedAt = now;
        }
        console.log(`[Stripe] Config loaded from SiteSettings (${effectiveMode})${mustForce ? " [forced]" : ""}`);
        return { stripe: inst, webhookSecret: webhook ?? "", mode: effectiveMode };
      }
    }
  } catch (err) {
    console.warn("[Stripe] Failed to load from SiteSettings:", err);
  }

  // 2. Fallback a env vars (solo si el modo pedido coincide con el prefijo)
  const secret = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
  const envIsLive = secret.startsWith("sk_live");
  const envMode: "test" | "live" = envIsLive ? "live" : "test";
  const effectiveMode = requestedMode ?? envMode;
  // Si el env no coincide con el modo pedido, igual devolvemos pero warn
  if (requestedMode && requestedMode !== envMode) {
    console.warn(`[Stripe] env STRIPE_SECRET_KEY es ${envMode} pero se pidió ${requestedMode}; usando env igualmente`);
  }
  const inst = new Stripe(secret, { apiVersion: "2023-10-16", typescript: true });
  const webhook = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!requestedMode) {
    cachedInstance = inst;
    cachedWebhook = webhook;
    cachedMode = effectiveMode;
    cachedAt = now;
    console.log(`[Stripe] Config loaded from env vars (${effectiveMode})`);
  }
  return { stripe: inst, webhookSecret: webhook, mode: effectiveMode };
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
