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
import type {
  Invitation,
  Order,
  Rsvp,
  QuizResponse,
  Template,
} from "./types";

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
  return snap.docs[0].data() as Invitation;
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
  orderId: string;
}): Promise<string> {
  const template = await getTemplateAdmin(params.templateId);
  if (!template) throw new Error("Plantilla no encontrada");

  const invitationRef = adminDb.collection("invitations").doc();
  const now = Date.now();

  const invitation: Invitation = {
    id: invitationRef.id,
    ownerUid: params.ownerUid,
    templateId: params.templateId,
    title: template.name,
    slug: params.slug,
    themeColor: template.builderConfig.theme.primaryColor,
    status: "draft",
    createdAt: now,
    orderId: params.orderId,
    tier: "free", // NUEVO: por defecto free
    tierUpdatedAt: now,
    builderConfig: template.builderConfig,
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
