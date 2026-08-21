// ============================================================================
// API /api/stripe/checkout - Crea una Stripe Checkout Session (server-side).
// Requiere JWT de Firebase en Authorization. Guarda el pedido (order) en
// Firestore y lo enlaza a la plantilla elegida para clonar en el webhook.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { SITE_URL } from "@/lib/seo";

export async function POST(req: NextRequest) {
  // 1) Autenticación: verifica el id token de Firebase.
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

  // 2) Cuerpo: plan y plantilla seleccionada.
  const { planId, templateId } = await req.json();

  // 3) Lee el plan para obtener el price de Stripe.
  const planSnap = await adminDb.collection("plans").doc(planId).get();
  if (!planSnap.exists) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }
  const plan = planSnap.data() as any;

  // 4) Crea el pedido en estado pendiente.
  const orderRef = adminDb.collection("orders").doc();
  await orderRef.set({
    id: orderRef.id,
    uid,
    planId,
    invitationId: null,
    status: "pending",
    stripeSessionId: "",
    createdAt: Date.now(),
  });

  // 5) Crea la sesión de Checkout.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/pricing`,
    metadata: {
      orderId: orderRef.id,
      uid,
      templateId: templateId ?? "",
    },
  });

  // 6) Actualiza el pedido con el session id.
  await orderRef.update({ stripeSessionId: session.id });

  return NextResponse.json({ url: session.url });
}
