// ============================================================================
// API /api/stripe/checkout/embedded - Legado (ya no lo usa la UI).
// Crea un PaymentIntent directo con amount+currency: NO requiere Productos/
// Precios de Stripe. Para el flujo actual usa /api/payments/checkout.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { getProviderCredentials, hasCredentials } from "@/lib/payments/config";

export const runtime = "nodejs";

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

  const { planId, templateId, mode } = await req.json();
  const isTest = mode === "test";

  const planSnap = await adminDb.collection("plans").doc(planId).get();
  if (!planSnap.exists) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }
  const plan = planSnap.data() as any;
  if (!plan.price || !plan.currency) {
    return NextResponse.json({ error: "Plan sin precio o moneda" }, { status: 400 });
  }
  if (plan.interval && plan.interval !== "one_time") {
    return NextResponse.json(
      { error: "Suscripciones: usa /api/payments/checkout (flujo hosted)." },
      { status: 400 }
    );
  }

  const creds = await getProviderCredentials("stripe", isTest ? "test" : "live");
  if (!hasCredentials("stripe", creds) || !creds.secretKey) {
    return NextResponse.json({ error: "No hay credenciales Stripe configuradas" }, { status: 400 });
  }
  const stripe = new Stripe(creds.secretKey, { apiVersion: "2023-10-16" });

  const orderRef = adminDb.collection("orders").doc();
  await orderRef.set({
    id: orderRef.id,
    uid,
    planId,
    templateId: templateId ?? null,
    invitationId: null,
    status: "pending",
    provider: "stripe",
    mode: isTest ? "test" : "live",
    amount: plan.price,
    currency: plan.currency,
    createdAt: Date.now(),
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: plan.price,
    currency: plan.currency.toLowerCase(),
    receipt_email: email || undefined,
    automatic_payment_methods: { enabled: true },
    metadata: { orderId: orderRef.id, uid, templateId: templateId ?? "" },
  });

  await orderRef.update({ providerRef: paymentIntent.id });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    publishableKey: creds.publishableKey,
    orderId: orderRef.id,
  });
}