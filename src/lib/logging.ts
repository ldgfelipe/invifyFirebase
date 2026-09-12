// ============================================================================
// LOGGING / AUDITORÍA - Utilidad para registrar eventos del sistema
// Uso: import { log } from "@/lib/logging"; log({ action: "order.paid", ... })
// ============================================================================
import { adminDb } from "./firebase/admin";
import type { LogEntry, LogAction } from "./types";

const LOGS_COLLECTION = "logs";
const MAX_BATCH_SIZE = 500; // Firestore batch limit

/** Cola en memoria para batch writes (server-side) */
let logBatch: LogEntry[] = [];
let batchTimer: NodeJS.Timeout | null = null;

/** Escribe logs en lote cada 2s o al alcanzar 500 entradas */
function flushBatch() {
  if (logBatch.length === 0) return;
  const batch = adminDb.batch();
  const toWrite = logBatch.splice(0, MAX_BATCH_SIZE);
  toWrite.forEach((entry) => {
    const ref = adminDb.collection(LOGS_COLLECTION).doc();
    batch.set(ref, entry);
  });
  batch.commit().catch((err) => console.error("[Logging] Batch commit failed:", err));
}

/** Añade entrada a la cola y programa flush */
function enqueue(entry: LogEntry) {
  logBatch.push(entry);
  if (!batchTimer) {
    batchTimer = setTimeout(flushBatch, 2000);
  }
  if (logBatch.length >= MAX_BATCH_SIZE) flushBatch();
}

/**
 * Registra un evento de auditoría.
 * - En servidor (API routes, webhooks): escribe a Firestore via Admin SDK (batch).
 * - En cliente: envía a API interna /api/logs (ver más abajo).
 */
export async function log(params: {
  action: LogAction;
  userId?: string;
  userEmail?: string;
  userRole?: "cliente" | "admin";
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
  severity?: "info" | "warning" | "error";
  description: string;
  ip?: string;
  userAgent?: string;
}) {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    action: params.action,
    timestamp: Date.now(),
    userId: params.userId,
    userEmail: params.userEmail,
    userRole: params.userRole,
    targetId: params.targetId,
    targetType: params.targetType,
    metadata: params.metadata,
    severity: params.severity ?? "info",
    description: params.description,
    ip: params.ip,
    userAgent: params.userAgent,
  };

  // En entorno servidor (Node), usa batch directo
  if (typeof window === "undefined") {
    enqueue(entry);
    return;
  }

  // En cliente, envía a API interna
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.warn("[Logging] Failed to send log from client:", err);
  }
}

/** Versión síncrona para server-side (no await) */
export function logSync(params: Parameters<typeof log>[0]) {
  if (typeof window === "undefined") {
    enqueue({
      id: crypto.randomUUID(),
      action: params.action,
      timestamp: Date.now(),
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      targetId: params.targetId,
      targetType: params.targetType,
      metadata: params.metadata,
      severity: params.severity ?? "info",
      description: params.description,
      ip: params.ip,
      userAgent: params.userAgent,
    });
  }
}

/** Helpers comunes */
export const LogHelper = {
  orderCreated: (orderId: string, userId: string, planId: string, amount: number) =>
    log({
      action: "order.created",
      targetId: orderId,
      targetType: "order",
      userId,
      metadata: { planId, amount },
      description: `Pedido creado: plan ${planId} por $${(amount / 100).toFixed(2)}`,
    }),

  orderPaid: (orderId: string, invitationId: string, userId: string) =>
    log({
      action: "order.paid",
      targetId: orderId,
      targetType: "order",
      userId,
      metadata: { invitationId },
      description: `Pago completado, invitación ${invitationId} creada`,
    }),

  orderFailed: (orderId: string, reason: string) =>
    log({
      action: "order.failed",
      targetId: orderId,
      targetType: "order",
      metadata: { reason },
      severity: "error",
      description: `Pago fallido: ${reason}`,
    }),

  orderCancelled: (orderId: string, userId: string, byAdmin: boolean) =>
    log({
      action: "order.cancelled",
      targetId: orderId,
      targetType: "order",
      userId,
      metadata: { byAdmin },
      severity: "warning",
      description: byAdmin ? "Admin canceló pedido pendiente" : "Usuario canceló su pedido",
    }),

  invitationCloned: (invitationId: string, templateId: string, userId: string) =>
    log({
      action: "invitation.cloned_from_template",
      targetId: invitationId,
      targetType: "invitation",
      userId,
      metadata: { templateId },
      description: `Invitación creada desde plantilla ${templateId}`,
    }),

  invitationUpdated: (invitationId: string, userId: string, changes: string[]) =>
    log({
      action: "invitation.updated",
      targetId: invitationId,
      targetType: "invitation",
      userId,
      metadata: { changes },
      description: `Invitación actualizada: ${changes.join(", ")}`,
    }),

  invitationPublished: (invitationId: string, userId: string) =>
    log({
      action: "invitation.published",
      targetId: invitationId,
      targetType: "invitation",
      userId,
      description: "Invitación publicada",
    }),

  settingsUpdated: (userId: string, sections: string[]) =>
    log({
      action: "settings.updated",
      targetId: "site/config",
      targetType: "settings",
      userId,
      metadata: { sections },
      description: `Configuración actualizada: ${sections.join(", ")}`,
    }),

  paymentKeysUpdated: (userId: string, provider: "stripe" | "paypal" | "mercadopago", mode: "test" | "live") =>
    log({
      action: "settings.payment_keys_updated",
      targetType: "settings",
      userId,
      metadata: { provider, mode },
      severity: "warning",
      description: `Claves de ${provider} (${mode}) actualizadas`,
    }),

  webhookReceived: (eventType: string, eventId: string) =>
    log({
      action: "webhook.received",
      targetId: eventId,
      targetType: "webhook",
      metadata: { eventType },
      description: `Webhook recibido: ${eventType}`,
    }),

  webhookProcessed: (eventType: string, eventId: string, orderId?: string) =>
    log({
      action: "webhook.processed",
      targetId: eventId,
      targetType: "webhook",
      metadata: { eventType, orderId },
      description: `Webhook procesado: ${eventType}${orderId ? ` → order ${orderId}` : ""}`,
    }),

  webhookFailed: (eventType: string, eventId: string, error: string) =>
    log({
      action: "webhook.failed",
      targetId: eventId,
      targetType: "webhook",
      severity: "error",
      metadata: { eventType, error },
      description: `Webhook falló: ${eventType} - ${error}`,
    }),

  userLogin: (userId: string, email: string) =>
    log({
      action: "user.login",
      userId,
      userEmail: email,
      description: `Inicio de sesión: ${email}`,
    }),

  userLogout: (userId: string, email: string) =>
    log({
      action: "user.logout",
      userId,
      userEmail: email,
      description: `Cierre de sesión: ${email}`,
    }),
};