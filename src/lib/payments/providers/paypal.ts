// ============================================================================
// PAYMENTS - Provider: PayPal (Checkout v2 / Orders API)
// Pago único sin productos: se cobra un amount directo en la orden.
// Flujo: crear order -> redirect a approve URL -> webhook PAYMENT.CAPTURE.
// ============================================================================
import { getProviderCredentials } from "../config";
import type { CheckoutContext, CheckoutResult } from "../types";

function paypalApiBase(mode: "test" | "live"): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(ctx: CheckoutContext, clientId: string, clientSecret: string): Promise<string> {
  const base = paypalApiBase(ctx.mode);
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PayPal: no se pudo obtener token (${res.status}) ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function paypalCreateCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
  const creds = await getProviderCredentials("paypal", ctx.mode);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error("No hay credenciales PayPal configuradas");
  }
  const token = await getAccessToken(ctx, creds.clientId, creds.clientSecret);
  const base = paypalApiBase(ctx.mode);

  // El price está en centavos; PayPal usa unidades mayores (ej. 49.00 USD).
  const amount = (ctx.plan.price / 100).toFixed(2);
  const currency = ctx.plan.currency.toUpperCase();

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: ctx.orderId,
          description: `${ctx.plan.name} · Invify`,
          amount: {
            currency_code: currency,
            value: amount,
          },
        },
      ],
      application_context: {
        brand_name: "Invify",
        user_action: "PAY_NOW",
        return_url: `${ctx.origin}/thanks?provider=paypal&paypal_order=${ctx.orderId}`,
        cancel_url: `${ctx.origin}/pricing`,
      },
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal: error creando orden (${res.status}) ${JSON.stringify(body).slice(0, 200)}`);
  }

  const approve = (body.links ?? []).find((l: any) => l.rel === "approve");
  if (!approve?.href) throw new Error("PayPal: no se obtuvo link de aprobación");
  return { type: "redirect", provider: "paypal", url: approve.href, providerRef: body.id };
}

/** Captura una orden de PayPal ya aprobada (usado por return_url / webhook). */
export async function paypalCaptureOrder(
  orderId: string,
  mode: "test" | "live",
  clientId?: string,
  clientSecret?: string
): Promise<{ id: string; status: string; captureId: string; amount: number; currency: string }> {
  const creds = clientId
    ? { mode, clientId, clientSecret }
    : await getProviderCredentials("paypal", mode);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error("No hay credenciales PayPal configuradas");
  }
  const token = await (async () => {
    const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
    const res = await fetch(`${paypalApiBase(mode)}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error("PayPal: no se pudo obtener token al capturar");
    return (await res.json()).access_token;
  })();

  const res = await fetch(`${paypalApiBase(mode)}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal: error al capturar (${res.status}) ${JSON.stringify(body).slice(0, 200)}`);
  }

  const pu = body.purchase_units?.[0] ?? {};
  const capture = pu.payments?.captures?.[0] ?? {};
  return {
    id: body.id,
    status: body.status,
    captureId: capture.id ?? "",
    amount: Math.round(parseFloat(pu.amount?.value ?? "0") * 100),
    currency: (pu.amount?.currency_code ?? "").toLowerCase(),
  };
}