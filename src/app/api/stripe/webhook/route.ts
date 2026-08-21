// ============================================================================
// API /api/stripe/webhook - Confirma pagos de Stripe (firma verificada).
// Al completar el pago: marca order=paid, clona la plantilla en una
// invitación nueva (status=draft) con slug único para el usuario.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase/admin";
import { cloneTemplateToInvitation } from "@/lib/firestore";
import { generateUniqueSlug, slugify } from "@/lib/slug";

export const runtime = "nodejs"; // requiere acceso a crypto para firmas

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: `Firma inválida: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { orderId, uid, templateId } = session.metadata ?? {};

    if (orderId && uid && templateId) {
      await procesarPagoExitoso({ orderId, uid, templateId });
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await adminDb.collection("orders").doc(orderId).update({ status: "failed" });
    }
  }

  return NextResponse.json({ received: true });
}

async function procesarPagoExitoso(params: {
  orderId: string;
  uid: string;
  templateId: string;
}) {
  // Lee la plantilla para derivar el slug base a partir de su nombre.
  const tplSnap = await adminDb.collection("templates").doc(params.templateId).get();
  const tplName = tplSnap.exists ? (tplSnap.data() as any).name : "mi-invitacion";

  // Genera un slug único verificando contra Firestore.
  const slug = await generateUniqueSlug(tplName, async (candidate) => {
    const snap = await adminDb
      .collection("invitations")
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    return !snap.empty;
  });

  // Clona la plantilla en una invitación del usuario (draft).
  const invitationId = await cloneTemplateToInvitation({
    ownerUid: params.uid,
    templateId: params.templateId,
    slug,
    planId: "", // se puede enriquecer con el plan del order
    orderId: params.orderId,
  });

  // Actualiza el pedido.
  await adminDb.collection("orders").doc(params.orderId).update({
    status: "paid",
    invitationId,
  });

  // (Opcional) se podría enviar email de confirmación aquí.
  void slugify; // utilidad disponible para futuros ajustes de slug
}
