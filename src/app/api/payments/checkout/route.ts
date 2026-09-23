// ============================================================================
// API /api/payments/checkout - Punto único para iniciar un pago con cualquier
// proveedor (stripe | paypal | mercadopago). Crea la orden en Firestore y
// delega al provider. No requiere Productos/Precios de Stripe.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { LogHelper } from "@/lib/logging";
import { stripeCreateCheckout } from "@/lib/payments/providers/stripe";
import { paypalCreateCheckout } from "@/lib/payments/providers/paypal";
import { mercadopagoCreateCheckout } from "@/lib/payments/providers/mercadopago";
import type { CheckoutContext, PaymentMode, PaymentProvider } from "@/lib/payments/types";
import { hasCredentials, getProviderCredentials } from "@/lib/payments/config";
import { getPlanDisplayPrice } from "@/lib/pricing";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";

function getOrigin(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-host");
  const host = forwarded ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const PROVIDERS: PaymentProvider[] = ["stripe", "paypal", "mercadopago"];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace("Bearer ", "");
  if (!idToken) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  let uid: string;
  let email: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email ?? "";
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  let body: { planId?: string; provider?: PaymentProvider; templateId?: string; mode?: PaymentMode; locale?: "en" | "es" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const provider = body.provider ?? "stripe";
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `Proveedor no soportado: ${provider}` }, { status: 400 });
  }
  const mode: PaymentMode = body.mode === "live" ? "live" : "test";
  const locale: "en" | "es" = body.locale === "en" ? "en" : "es";

  // ¿Está configurado el proveedor para este modo?
  const creds = await getProviderCredentials(provider, mode);
  if (!hasCredentials(provider, creds)) {
    return NextResponse.json(
      { error: `No hay credenciales ${provider} (${mode}) configuradas en el panel admin` },
      { status: 400 }
    );
  }

  const planSnap = await adminDb.collection("plans").doc(body.planId ?? "").get();
  if (!planSnap.exists) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }
  const plan = planSnap.data() as any;
  if (!plan.price || !plan.currency) {
    return NextResponse.json({ error: "Plan sin precio o moneda" }, { status: 400 });
  }

// Monto y moneda que se cobran = lo que se muestra en el idioma elegido
// (EN -> USD, ES -> base). Mercado Pago México solo soporta MXN, así que ahí
// siempre se cobra el precio base del plan.
const baseCharge = {
  amount: Number(plan.price ?? 0),
  currency: String(plan.currency ?? "mxn").toLowerCase(),
};
let charge = baseCharge;
if (provider !== "mercadopago") {
  const dp = getPlanDisplayPrice(plan as Plan, locale);
  if (dp && dp.source === "usd") {
    charge = { amount: dp.cents, currency: "usd" };
  }
}

  // 1. Crear la orden
  const orderRef = adminDb.collection("orders").doc();
  const orderId = orderRef.id;
  await orderRef.set({
    id: orderId,
    uid,
    planId: plan.id,
    templateId: body.templateId ?? null,
    invitationId: null,
    status: "pending",
    provider,
    mode,
    locale,
    amount: charge.amount,
    currency: charge.currency,
    createdAt: Date.now(),
  });

  await LogHelper.orderCreated(orderId, uid, plan.id, charge.amount);

  // 2. Delegar al proveedor
  const ctx: CheckoutContext = {
    plan: {
      id: plan.id,
      name: plan.name,
      price: charge.amount,
      currency: charge.currency,
      interval: plan.interval,
      stripePriceIdTest: plan.stripePriceIdTest,
      stripePriceIdLive: plan.stripePriceIdLive,
    },
    uid,
    email,
    templateId: body.templateId,
    mode,
    origin: getOrigin(req),
    orderId,
  };

  try {
    let result;
    if (provider === "stripe") result = await stripeCreateCheckout(ctx);
    else if (provider === "paypal") result = await paypalCreateCheckout(ctx);
    else result = await mercadopagoCreateCheckout(ctx);

    if (result.providerRef) {
      await orderRef.update({ providerRef: result.providerRef });
    }

    return NextResponse.json({ orderId, provider, result });
  } catch (err: any) {
    // Si falló la creación del cobro, marca la orden como failed.
    await orderRef.update({ status: "failed", error: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}