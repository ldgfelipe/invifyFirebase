// ============================================================================
// FIRESTORE (servidor) - helpers
// Lecturas/escrituras públicas: SDK web (serverDb, usa tu apiKey).
// Clonado post-pago (webhook): Admin SDK (requiere cuenta de servicio).
// ============================================================================
import {
  collection,
  doc,
  query,
  where,
  limit,
  getDoc,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { serverDb } from "./firebase/serverClient";
import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { LogHelper } from "./logging";
import { isInvitationExpired } from "./invitationValidity";
import { getPlanFeatures, RETENTION_GRACE_MS, filterBuilderConfig } from "./plans";
import type {
  Invitation,
  Order,
  PlanFeatures,
  Rsvp,
  QuizResponse,
  Template,
} from "./types";

/**
 * Despublica una invitación (status → draft). Usado por la vigencia.
 * Best-effort: si no hay Admin SDK disponible, el guard de lectura la oculta igual.
 */
export async function unpublishInvitation(
  invitationId: string,
  reason = "event_expired"
): Promise<void> {
  const now = Date.now();
  await adminDb.collection("invitations").doc(invitationId).update({
    status: "draft",
    unpublishedAt: now,
    unpublishedReason: reason,
    // Se eliminará tras la gracia, salvo que el cliente la conserve.
    deleteAfter: now + RETENTION_GRACE_MS,
  });
  await LogHelper.invitationUnpublished(invitationId, reason);
}

/** Marca una invitación para conservarla (no se borra automáticamente). */
export async function retainInvitation(
  invitationId: string,
  userId?: string
): Promise<void> {
  await adminDb.collection("invitations").doc(invitationId).update({
    retain: true,
    retainedAt: Date.now(),
    deleteAfter: FieldValue.delete(),
  });
  await LogHelper.invitationRetained(invitationId, userId);
}

/** Borra una invitación y sus subcolecciones (rsvps, quizResponses). */
export async function deleteInvitationDeep(
  invitationId: string,
  reason = "retention_expired",
  userId?: string
): Promise<void> {
  const invRef = adminDb.collection("invitations").doc(invitationId);
  for (const sub of ["rsvps", "quizResponses"] as const) {
    // Borra por lotes hasta vaciar la subcolección.
    for (;;) {
      const snap = await invRef.collection(sub).limit(300).get();
      if (snap.empty) break;
      const batch = adminDb.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (snap.size < 300) break;
    }
  }
  await invRef.delete();
  await LogHelper.invitationDeleted(invitationId, reason, userId);
}

/** Busca una invitación publicada por slug (usado en /i/[slug] SSR). */
export async function getPublishedInvitationBySlug(
  slug: string
): Promise<Invitation | null> {
  const q = query(
    collection(serverDb, "invitations"),
    where("slug", "==", slug),
    where("status", "==", "published"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const inv = doc.data() as Invitation;

  // Vigencia: si el evento ya pasó (evento + 1 día), despublica y oculta.
  if (isInvitationExpired(inv)) {
    try {
      await unpublishInvitation(doc.id, "event_expired");
    } catch (err) {
      console.warn("[Vigencia] No se pudo despublicar invitación vencida:", err);
    }
    return null;
  }

  return inv;
}

/** Incrementa contadores de vistas (Admin SDK; best-effort en el webhook). */
export async function incrementInvitationViews(
  invitationId: string,
  unique: boolean
): Promise<void> {
  const ref = adminDb.collection("invitations").doc(invitationId);
  await ref.update({
    "stats.views": FieldValue.increment(1),
    ...(unique ? { "stats.uniqueViews": FieldValue.increment(1) } : {}),
  });
}

/** Obtiene una plantilla por id (lectura pública con SDK web). */
export async function getTemplate(templateId: string): Promise<Template | null> {
  const snap = await getDoc(doc(serverDb, "templates", templateId));
  return snap.exists() ? (snap.data() as Template) : null;
}

/** Obtiene una plantilla por id (Admin SDK, para webhooks). */
export async function getTemplateAdmin(templateId: string): Promise<Template | null> {
  const snap = await adminDb.collection("templates").doc(templateId).get();
  return snap.exists ? (snap.data() as Template) : null;
}

/**
 * Clona una plantilla en una nueva invitación del usuario (post-pago).
 * Usa Admin SDK porque escribe como el usuario sin su token (contexto Stripe).
 */
export async function cloneTemplateToInvitation(params: {
  ownerUid: string;
  templateId: string;
  slug: string;
  planId: string;
  orderId: string | null;
  features?: PlanFeatures;
}): Promise<string> {
  const template = await getTemplateAdmin(params.templateId);
  if (!template) throw new Error("Plantilla no encontrada");

  const invitationRef = adminDb.collection("invitations").doc();
  const now = Date.now();

  const features = params.features ?? getPlanFeatures(params.planId);
  // Básico no incluye RSVP/Quiz/Música → filtrar módulos no permitidos al clonar
  const filteredConfig = filterBuilderConfig(template.builderConfig, features);

  const invitation: Invitation = {
    id: invitationRef.id,
    ownerUid: params.ownerUid,
    templateId: params.templateId,
    title: template.name,
    slug: params.slug,
    themeColor: filteredConfig.theme.primaryColor,
    status: "draft",
    createdAt: now,
    orderId: params.orderId,
    planId: params.planId || undefined,
    tier: params.planId ? "premium" : "free",
    features,
    tierUpdatedAt: now,
    builderConfig: filteredConfig,
    stats: { views: 0, uniqueViews: 0 },
  };

  await invitationRef.set(invitation);
  return invitationRef.id;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(serverDb, "orders", orderId));
  return snap.exists() ? (snap.data() as Order) : null;
}

export async function saveRsvp(
  invitationId: string,
  data: Rsvp
): Promise<void> {
  await addDoc(
    collection(serverDb, "invitations", invitationId, "rsvps"),
    data
  );
}

export async function saveQuizResponse(
  invitationId: string,
  data: QuizResponse
): Promise<void> {
  await addDoc(
    collection(serverDb, "invitations", invitationId, "quizResponses"),
    data
  );
}
