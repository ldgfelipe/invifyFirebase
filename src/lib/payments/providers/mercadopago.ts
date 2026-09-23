// ============================================================================
// PAYMENTS - Provider: Mercado Pago (Checkout Pro / Preferences API)
// Pago único sin productos: la preferencia lleva el monto directo en items.
// Flujo: crear preferencia -> redirect a init_point -> webhook payments.
// ============================================================================
import crypto from "node:crypto";
import { getProviderCredentials } from "../config";
import type { CheckoutContext, CheckoutResult } from "../types";

function mpApiBase(mode: "test" | "live"): string {
  return mode === "live" ? "https://api.mercadopago.com" : "https://api.mercadopago.com";
}

export async function mercadopagoCreateCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
  const creds = await getProviderCredentials("mercadopago", ctx.mode);
  if (!creds.accessToken) {
    throw new Error("No hay Access Token de Mercado Pago configurado");
  }
  const base = mpApiBase(ctx.mode);
  const unitPrice = ctx.plan.price / 100; // centavos -> unidades

  // En test, MP devuelve sandbox_init_point; en live, init_point.
  const res = await fetch(`${base}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          id: ctx.plan.id,
          title: `${ctx.plan.name} · Invify`,
          quantity: 1,
          currency_id: ctx.plan.currency.toUpperCase(),
          unit_price: unitPrice,
        },
      ],
      external_reference: ctx.orderId,
      back_urls: {
        success: `${ctx.origin}/thanks?provider=mercadopago&mp_order=${ctx.orderId}`,
        pending: `${ctx.origin}/pricing`,
        failure: `${ctx.origin}/pricing`,
      },
      auto_return: "approved",
      notification_url: `${ctx.origin}/api/payments/webhook/mercadopago`,
      purpose: "wallet_purchase",
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Mercado Pago: error creando preferencia (${res.status}) ${JSON.stringify(body).slice(0, 200)}`);
  }

  const url = ctx.mode === "live" ? body.init_point : body.sandbox_init_point ?? body.init_point;
  if (!url) throw new Error("Mercado Pago: sin init_point");
  return { type: "redirect", provider: "mercadopago", url, providerRef: String(body.id) };
}

/**
 * Verifica la firma X-Signature de Mercado Pago (HMAC-SHA256) cuando hay
 * webhook secret configurado; si no, retorna true (es decir, el endpoint
 * igualmente valida el pago consultando el status en su API antes de honrarlo).
 */
export async function mercadopagoVerifySignature(
  headers: Record<string, string>,
  body: string,
  mode: "test" | "live"
): Promise<boolean> {
  const creds = await getProviderCredentials("mercadopago", mode);
  const secret = creds.mpWebhookSecret ?? creds.accessToken;
  if (!secret) return true; // no hay firma configurada: se valida por API

  const xSignature = headers["x-signature"] ?? "";
  const xRequestId = headers["x-request-id"] ?? "";
  const tsMatch = /ts=(\d+)/.exec(xSignature);
  const v1Match = /v1=([a-f0-9]+)/i.exec(xSignature);
  if (!tsMatch || !v1Match) return false;

  const dataIdMatch = /"id":\s*(\d+)/.exec(body);
  const id = dataIdMatch?.[1] ?? "";
  const manifest = `id:${id};request-id:${xRequestId};ts:${tsMatch[1]};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return expected === v1Match[1].toLowerCase();
}

/** Consulta el status de un pago en la API de MP (fuente de verdad). */
export async function mercadopagoGetPayment(
  paymentId: string,
  mode: "test" | "live"
): Promise<{ id: string; status: string; externalReference?: string; transactionAmount: number; currencyId: string } | null> {
  const creds = await getProviderCredentials("mercadopago", mode);
  if (!creds.accessToken) return null;
  const res = await fetch(`${mpApiBase(mode)}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${creds.accessToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mercado Pago: error consultando pago (${res.status})`);
  const b = await res.json();
  return {
    id: String(b.id),
    status: b.status,
    externalReference: b.external_reference,
    transactionAmount: Math.round(Number(b.transaction_amount ?? 0) * 100),
    currencyId: b.currency_id?.toLowerCase(),
  };
}