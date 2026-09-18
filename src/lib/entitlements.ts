// ============================================================================
// ENTITLEMENTS (servidor) - Consulta el plan/cupo de una cuenta y su uso.
// Usa Admin SDK; se apoya en helpers puros de ./plans y ./invitationValidity.
// ============================================================================
import { adminDb } from "./firebase/admin";
import { isInvitationActive } from "./invitationValidity";
import {
  canUseTemplate,
  FREE_FEATURES,
  formatQuota,
} from "./plans";
import type { Invitation, PlanEntitlements, UserEntitlements } from "./types";

// Entitlements "de administrador": todo incluido e ilimitado.
export const ADMIN_ENTITLEMENTS: UserEntitlements = {
  planId: "admin",
  planName: "Admin",
  quota: "unlimited",
  interval: "month",
  features: {
    rsvp: true,
    quiz: true,
    audio: true,
    stats: true,
    allTemplates: true,
    prioritySupport: true,
  },
  allowedTemplateIds: "all",
  subscriptionActive: true,
  updatedAt: 0,
};

export interface AccountUsage {
  entitlements: UserEntitlements | null;
  active: number;
  quota: number | "unlimited";
  remaining: number | "unlimited";
  canCreateMore: boolean;
}

/** Lee los entitlements (y el rol) del usuario. Admin → todo incluido. */
export async function getUserEntitlements(
  uid: string
): Promise<UserEntitlements | null> {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  if (data.role === "admin") return ADMIN_ENTITLEMENTS;
  return (data.entitlements as UserEntitlements) ?? null;
}

/** Cuenta las invitaciones ACTIVAS (no vencidas) del dueño. */
export async function countActiveInvitations(
  uid: string,
  now: number = Date.now()
): Promise<number> {
  const snap = await adminDb
    .collection("invitations")
    .where("ownerUid", "==", uid)
    .get();
  return snap.docs.filter((d) =>
    isInvitationActive(d.data() as Invitation, now)
  ).length;
}

/** Cuenta invitaciones activas del dueño excluyendo una (para validar cupo al publicar). */
export async function countActiveInvitationsExcluding(
  uid: string,
  excludeId: string,
  now: number = Date.now()
): Promise<number> {
  const snap = await adminDb
    .collection("invitations")
    .where("ownerUid", "==", uid)
    .get();
  return snap.docs.filter(
    (d) => d.id !== excludeId && isInvitationActive(d.data() as Invitation, now)
  ).length;
}

/** Uso actual de la cuenta: entitlements, activas, cupo y restante. */
export async function getAccountUsage(uid: string): Promise<AccountUsage> {
  const entitlements = await getUserEntitlements(uid);
  const quota = entitlements?.quota ?? 0;
  const active = entitlements ? await countActiveInvitations(uid) : 0;
  const remaining =
    quota === "unlimited" ? ("unlimited" as const) : Math.max(0, quota - active);
  return {
    entitlements,
    active,
    quota,
    remaining,
    canCreateMore:
      !!entitlements &&
      (quota === "unlimited" || (remaining as number) > 0),
  };
}

/** ¿La cuenta puede usar la plantilla? (admin incluido). */
export function entitlementAllowsTemplate(
  entitlements: UserEntitlements | null,
  templateId: string
): boolean {
  return canUseTemplate(entitlements, templateId);
}

export { formatQuota };

/** Etiqueta del plan de la cuenta para UI. */
export function describeEntitlements(
  entitlements: UserEntitlements | null
): { planName: string; quota: string; features: PlanEntitlements["features"] } {
  if (!entitlements) {
    return { planName: "Sin plan", quota: "0", features: FREE_FEATURES };
  }
  return {
    planName: entitlements.planName,
    quota: formatQuota(entitlements.quota),
    features: entitlements.features,
  };
}
