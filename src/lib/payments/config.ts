// ============================================================================
// PAYMENTS - Configuración de claves por proveedor.
// Prioridad: SiteSettings (Firestore /site/config) > env vars.
// Cada proveedor usa credenciales test o live según `mode`.
// ============================================================================
import { adminDb } from "@/lib/firebase/admin";
import type { PaymentMode, PaymentProvider } from "./types";

export interface ProviderCredentials {
  mode: PaymentMode;
  // Stripe
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  // PayPal
  clientId?: string;
  clientSecret?: string;
  webhookId?: string;
  // Mercado Pago
  accessToken?: string;
  publicKey?: string;
  mpWebhookSecret?: string;
}

/** Lee la config de un proveedor para el modo solicitado. */
export async function getProviderCredentials(
  provider: PaymentProvider,
  mode: PaymentMode
): Promise<ProviderCredentials> {
  const settings = await loadSiteSettings();

  // Camino 1: SiteSettings (Firestore)
  const resolved: ProviderCredentials = {
    mode,
    ...pickForMode(provider, mode, settings),
  };

  // Camino 2: env vars (fallback)
  const env = pickFromEnv(provider, mode);
  if (!hasCredentials(provider, resolved)) {
    resolved.secretKey = env.secretKey;
    resolved.publishableKey = env.publishableKey;
    resolved.webhookSecret = env.webhookSecret;
    resolved.clientId = env.clientId;
    resolved.clientSecret = env.clientSecret;
    resolved.webhookId = env.webhookId;
    resolved.accessToken = env.accessToken;
    resolved.publicKey = env.publicKey;
    resolved.mpWebhookSecret = env.mpWebhookSecret;
  }

  return resolved;
}

/** Comprueba si ya hay credenciales suficientes para el proveedor. */
export function hasCredentials(provider: PaymentProvider, creds: ProviderCredentials): boolean {
  switch (provider) {
    case "stripe":
      return Boolean(creds.secretKey);
    case "paypal":
      return Boolean(creds.clientId && creds.clientSecret);
    case "mercadopago":
      return Boolean(creds.accessToken);
  }
}

async function loadSiteSettings(): Promise<Record<string, any>> {
  try {
    const snap = await adminDb.collection("site").doc("config").get();
    return snap.exists ? (snap.data() as Record<string, any>) : {};
  } catch {
    return {};
  }
}

/** Extrae las claves del SiteSettings correspondientes al (provider, modo). */
function pickForMode(
  provider: PaymentProvider,
  mode: PaymentMode,
  s: Record<string, any>
): Partial<ProviderCredentials> {
  const t = mode === "test" ? "Test" : "Live";
  switch (provider) {
    case "stripe":
      return {
        secretKey: s[`stripe${t}SecretKey`],
        publishableKey: s[`stripe${t}PublishableKey`],
        webhookSecret: s[`stripe${t}WebhookSecret`],
      };
    case "paypal":
      return {
        clientId: s[`paypal${t}ClientId`],
        clientSecret: s[`paypal${t}Secret`],
        webhookId: s[`paypal${t}WebhookId`],
      };
    case "mercadopago":
      return {
        accessToken: s[`mercadopago${t}AccessToken`],
        publicKey: s[`mercadopago${t}PublicKey`],
        mpWebhookSecret: s[`mercadopago${t}WebhookSecret`],
      };
  }
}

/** Fallback a variables de entorno. */
function pickFromEnv(
  provider: PaymentProvider,
  mode: PaymentMode
): Partial<ProviderCredentials> {
  switch (provider) {
    case "stripe": {
      const secret = process.env.STRIPE_SECRET_KEY ?? "";
      const isLive = secret.startsWith("sk_live");
      const matches = (mode === "live") === isLive;
      return matches
        ? {
            secretKey: secret,
            publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          }
        : {};
    }
    case "paypal": {
      const clientId = process.env.PAYPAL_CLIENT_ID ?? "";
      const live = Boolean(process.env.PAYPAL_ENV === "live");
      return clientId
        ? {
            clientId,
            clientSecret: process.env.PAYPAL_CLIENT_SECRET,
            webhookId: process.env.PAYPAL_WEBHOOK_ID,
            mode: mode === "live" ? (live ? "live" : "test") : mode,
          }
        : {};
    }
    case "mercadopago":
      return {
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        publicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
        mpWebhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
      };
  }
}