// ============================================================================
// API /api/stripe/checkout/embedded - Crea un PaymentIntent para
// Stripe Elements (embedded). Devuelve client_secret para PaymentElement.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { log, LogHelper } from "@/lib/logging";

function getOrigin(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-host");
  const host = forwarded ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

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

  const orderRef = adminDb.collection("orders").doc();
  await orderRef.set({
    id: orderRef.id,
    uid,
    planId,
    templateId,
    invitationId: null,
    status: "pending",
    stripePaymentIntentId: "",
    amount: plan.price,
    createdAt: Date.now(),
  });

  const stripe = await getStripe(isTest ? "test" : "live");

  // Usar el Price ID correspondiente al modo
  const priceId = isTest ? plan.stripePriceIdTest : plan.stripePriceIdLive;
  if (!priceId) {
    return NextResponse.json({ error: `Price ID ${isTest ? "test" : "live"} no configurado para este plan` }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: plan.price,
    currency: plan.currency ?? "mxn",
    receipt_email: email,
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: orderRef.id,
      uid,
      templateId: templateId ?? "",
    },
  });

  await orderRef.update({ stripePaymentIntentId: paymentIntent.id });

  // Log de auditoría
  await LogHelper.orderCreated(orderRef.id, uid, planId, plan.price);

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}