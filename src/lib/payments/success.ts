// ============================================================================
// PAYMENTS - Finalización de pago exitoso (compartido por los 3 proveedores).
// Clona la plantilla seleccionada, marca la invitación como premium y la
// orden como pagada. Es idempotente (si la orden ya está pagada, no repite).
// ============================================================================
import { adminDb } from "@/lib/firebase/admin";
import { cloneTemplateToInvitation } from "@/lib/firestore";
import { generateUniqueSlug } from "@/lib/slug";
import { LogHelper, log } from "@/lib/logging";

export async function processPaymentSuccess(params: {
  orderId: string;
  uid: string;
  templateId: string;
  provider?: string;
  providerRef?: string;
}) {
  const orderRef = adminDb.collection("orders").doc(params.orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    await log({
      action: "webhook.failed",
      targetId: params.orderId,
      targetType: "order",
      severity: "error",
      metadata: { reason: "order-not-found", provider: params.provider },
      description: "Orden no encontrada al procesar pago",
    });
    throw new Error("Orden no encontrada");
  }

  const order = orderSnap.data() as any;
  if (order.status === "paid" && order.invitationId) {
    await log({
      action: "webhook.processed",
      targetId: params.orderId,
      targetType: "order",
      metadata: { reason: "duplicate" },
      description: "Order ya procesado (duplicado)",
    });
    return;
  }

  const tplSnap = await adminDb.collection("templates").doc(params.templateId).get();
  if (!tplSnap.exists) {
    await log({
      action: "webhook.failed",
      targetId: params.orderId,
      targetType: "order",
      severity: "error",
      metadata: { reason: "template-not-found", templateId: params.templateId },
      description: "Plantilla no existe en Firestore",
    });
    throw new Error("Plantilla no encontrada");
  }
  const tplName = (tplSnap.data() as any).name ?? "mi-invitacion";

  const slug = await generateUniqueSlug(tplName, async (candidate) => {
    const snap = await adminDb
      .collection("invitations")
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    return !snap.empty;
  });

  const invitationId = await cloneTemplateToInvitation({
    ownerUid: params.uid,
    templateId: params.templateId,
    slug,
    planId: order.planId ?? "",
    orderId: params.orderId,
  });

  await adminDb.collection("invitations").doc(invitationId).update({
    tier: "premium",
    tierUpdatedAt: Date.now(),
  });

  await orderRef.update({
    status: "paid",
    invitationId,
    ...(params.provider ? { provider: params.provider } : {}),
    ...(params.providerRef ? { providerRef: params.providerRef } : {}),
    paidAt: Date.now(),
  });

  await LogHelper.orderPaid(params.orderId, invitationId, params.uid);
  await LogHelper.invitationCloned(invitationId, params.templateId, params.uid);
}