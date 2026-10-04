// ============================================================================
// PLANES / ENTITLEMENTS
// Catálogo central de qué incluye cada plan (cupos y features) y utilidades
// puras para consultarlo y fusionarlo al comprar. Sin Firebase.
//
// Reglas de negocio:
//  - Básico  (pago único):  1 invitación activa, 1 tema, SIN RSVP/Quiz/Música.
//  - Pro     (pago único):  5 invitaciones activas, RSVP+Quiz+Música, stats.
//  - Premium (suscripción): invitaciones ilimitadas, todo el catálogo de temas.
// ============================================================================
import type {
  Invitation,
  PlanEntitlements,
  PlanFeatures,
  UserEntitlements,
} from "./types";

// Features vacías (invitación gratuita / sin plan).
export const FREE_FEATURES: PlanFeatures = {
  rsvp: false,
  quiz: false,
  audio: false,
  stats: false,
  allTemplates: false,
  prioritySupport: false,
};

const ALL_FEATURES: PlanFeatures = {
  rsvp: true,
  quiz: true,
  audio: true,
  stats: true,
  allTemplates: true,
  prioritySupport: true,
};

// Catálogo por defecto. Debe coincidir con scripts/seedData.mjs.
export const PLAN_CATALOG: Record<string, PlanEntitlements> = {
  plan_basic: {
    planId: "plan_basic",
    planName: "Básico",
    quota: 1,
    interval: "one_time",
    features: {
      rsvp: false,
      quiz: false,
      audio: false,
      stats: false,
      allTemplates: false,
      prioritySupport: false,
    },
  },
  plan_pro: {
    planId: "plan_pro",
    planName: "Pro",
    quota: 5,
    interval: "one_time",
    features: {
      rsvp: true,
      quiz: true,
      audio: true,
      stats: true,
      allTemplates: false,
      prioritySupport: false,
    },
  },
  plan_premium: {
    planId: "plan_premium",
    planName: "Premium",
    quota: "unlimited",
    interval: "month",
    features: ALL_FEATURES,
  },
};

// Gracia antes de borrar una invitación vencida y no conservada (30 días).
export const RETENTION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Entitlements de un plan.
 * - Plan conocido → catálogo.
 * - planId no vacío desconocido → permisivo (plan custom creado por admin).
 * - Vacío/undefined → gratuito (todo restringido).
 */
export function getPlanEntitlements(
  planId?: string | null
): PlanEntitlements | null {
  if (!planId) return null;
  const known = PLAN_CATALOG[planId];
  if (known) return known;
  return {
    planId,
    planName: planId,
    quota: "unlimited",
    interval: "one_time",
    features: { ...ALL_FEATURES },
  };
}

/** Features de un plan (gratuito si no hay plan). */
export function getPlanFeatures(planId?: string | null): PlanFeatures {
  return getPlanEntitlements(planId)?.features ?? { ...FREE_FEATURES };
}

/**
 * Entitlements efectivos de un plan combinando el catálogo con el doc de
 * /plans/{id} (permite overrides desde admin). `planData.entitlement` es parcial.
 *
 * Ojo con el plan que no está en PLAN_CATALOG: los ids de /plans los genera
 * Stripe, así que casi ninguno coincide con las claves del catálogo y este caso
 * es el normal, no la excepción. Antes, al no encontrarlo, se caía a un fallback
 * permisivo con TODAS las features, y al aplicar encima un `entitlement`
 * parcial las que no se mencionaran seguían en true. Consecuencia real: un
 * cliente que pagó "Basico" (sin `entitlement`) recibia ilimitadas, RSVP, quiz y
 * todo el catálogo, igual que Premium.
 *
 * Ahora, si el documento trae `entitlement`, ese documento ES la definición: las
 * features de partida son las de plan gratuito, no las de plan completo. Si no lo
 * trae, se mantiene el fallback permisivo para no romper planes custom que se
 * crean sin definir nada.
 */
export function resolvePlanEntitlements(
  planId?: string | null,
  planData?: {
    name?: string;
    interval?: PlanEntitlements["interval"];
    entitlement?: Partial<PlanEntitlements>;
  } | null
): PlanEntitlements | null {
  if (!planId) return null;

  const cat = PLAN_CATALOG[planId];
  const defineElDoc = Boolean(planData?.entitlement?.features);
  const base: PlanEntitlements = cat ?? {
    planId,
    planName: planId,
    quota: "unlimited",
    interval: "one_time",
    features: defineElDoc ? { ...FREE_FEATURES } : { ...ALL_FEATURES },
  };

  if (!planData) return base;
  return {
    planId: base.planId,
    planName: planData.name ?? base.planName,
    quota: planData.entitlement?.quota ?? base.quota,
    interval: planData.interval ?? base.interval,
    features: { ...base.features, ...(planData.entitlement?.features ?? {}) },
  };
}

/** Cupo de invitaciones activas del plan (0 si es gratuito). */
export function getPlanQuota(
  planId?: string | null
): number | "unlimited" {
  return getPlanEntitlements(planId)?.quota ?? 0;
}

/** Features efectivas de una invitación (snapshot o lookup por planId). */
export function getInvitationFeatures(
  inv: Pick<Invitation, "planId" | "features">
): PlanFeatures {
  return inv.features ?? getPlanFeatures(inv.planId);
}

/** Módulos del builder sujetos a plan. */
export const GATED_MODULES = ["rsvp", "quiz", "audio"] as const;
export type GatedModule = (typeof GATED_MODULES)[number];

/** ¿El plan permite este módulo? */
export function isModuleAllowed(
  moduleType: string,
  features: PlanFeatures
): boolean {
  switch (moduleType) {
    case "rsvp":
      return features.rsvp;
    case "quiz":
      return features.quiz;
    case "audio":
      return features.audio;
    default:
      return true;
  }
}

/** Filtra un BuilderConfig quitando módulos no permitidos por el plan. */
export function filterBuilderConfig(
  config: import("./types").BuilderConfig,
  features: PlanFeatures
): import("./types").BuilderConfig {
  return {
    ...config,
    modules: config.modules.filter((m) => isModuleAllowed(m.type, features)),
  };
}

/** ¿Cuántos módulos gateados serían eliminados? (para mensajes al usuario). */
export function countBlockedModules(
  config: import("./types").BuilderConfig,
  features: PlanFeatures
): number {
  return config.modules.filter((m) => !isModuleAllowed(m.type, features)).length;
}

/** Jerarquía de un plan según su cupo (ilimitado gana). */
function planRank(quota: number | "unlimited"): number {
  return quota === "unlimited" ? Number.POSITIVE_INFINITY : quota;
}

/**
 * Fusiona los entitlements actuales de la cuenta con los de un nuevo plan.
 * - quota: se acumula en pagos únicos; "unlimited" gana siempre.
 * - features: unión (OR) — nunca se pierden capacidades ya compradas.
 * - allowedTemplateIds: se acumulan, salvo que el plan dé todo el catálogo.
 * - planId/planName: se conserva el de mayor jerarquía.
 */
export function mergeEntitlements(params: {
  current?: UserEntitlements | null;
  plan: PlanEntitlements;
  templateId?: string | null;
}): UserEntitlements {
  const { current, plan, templateId } = params;
  const now = Date.now();

  const quota: number | "unlimited" =
    plan.quota === "unlimited" || current?.quota === "unlimited"
      ? "unlimited"
      : (current?.quota ?? 0) + plan.quota;

  const features: PlanFeatures = {
    rsvp: Boolean(current?.features.rsvp || plan.features.rsvp),
    quiz: Boolean(current?.features.quiz || plan.features.quiz),
    audio: Boolean(current?.features.audio || plan.features.audio),
    stats: Boolean(current?.features.stats || plan.features.stats),
    allTemplates: Boolean(
      current?.features.allTemplates || plan.features.allTemplates
    ),
    prioritySupport: Boolean(
      current?.features.prioritySupport || plan.features.prioritySupport
    ),
  };

  const keepCurrentPlan =
    !!current && planRank(current.quota) > planRank(plan.quota);

  const allowedTemplateIds: string[] | "all" = features.allTemplates
    ? "all"
    : Array.from(
        new Set([
          ...(Array.isArray(current?.allowedTemplateIds)
            ? current!.allowedTemplateIds
            : []),
          ...(templateId ? [templateId] : []),
        ])
      );

  const subscription =
    plan.interval !== "one_time" || current?.subscriptionActive
      ? {
          subscriptionActive: true,
          subscriptionExpiresAt: current?.subscriptionExpiresAt,
        }
      : {};

  return {
    planId: keepCurrentPlan ? current!.planId : plan.planId,
    planName: keepCurrentPlan ? current!.planName : plan.planName,
    quota,
    features,
    interval: keepCurrentPlan ? current!.interval : plan.interval,
    allowedTemplateIds,
    ...subscription,
    updatedAt: now,
  };
}

/** ¿La cuenta puede usar una plantilla? */
export function canUseTemplate(
  entitlements: UserEntitlements | null | undefined,
  templateId: string
): boolean {
  if (!entitlements) return false;
  if (entitlements.allowedTemplateIds === "all") return true;
  if (entitlements.features.allTemplates) return true;
  return entitlements.allowedTemplateIds.includes(templateId);
}

/** Etiqueta legible del cupo. */
export function formatQuota(quota: number | "unlimited" | undefined): string {
  if (quota === "unlimited") return "Ilimitadas";
  if (!quota) return "0";
  return `${quota}`;
}

/**
 * REEMPLAZA los entitlements de una cuenta con los de un plan.
 *
 * Es el contrapunto de mergeEntitlements, que solo une y por diseño nunca quita
 * nada (un cliente que pagó Pro y compra Premium no pierde lo que ya tenía). Un
 * cambio de plan desde admin es otra cosa: es una corrección o una prueba, y si
 * no bisa las capacidades el selector de plan no serviría para nada.
 *
 * Se conservan los datos que no vienen del plan:
 *   - allowedTemplateIds: si el plan abre todo el catálogo pasa a "all"; si no,
 *     se conservan las plantillas ya compradas, porque no son una capacidad del
 *     plan sino un pago anterior.
 *   - subscriptionExpiresAt: se mantiene para no extender la suscripción de
 *     forma accidental al cambiar de plan.
 */
export function replaceEntitlements(params: {
  current?: UserEntitlements | null;
  plan: PlanEntitlements;
  /** Plantillas ya compradas, si el admin las quiere conservar. */
  preserveTemplateIds?: string[] | null;
}): UserEntitlements {
  const { current, plan, preserveTemplateIds } = params;

  const compradas = Array.isArray(preserveTemplateIds)
    ? preserveTemplateIds
    : Array.isArray(current?.allowedTemplateIds)
      ? current!.allowedTemplateIds
      : [];

  const allowedTemplateIds: string[] | "all" = plan.features.allTemplates
    ? "all"
    : Array.from(new Set(compradas));

  return {
    planId: plan.planId,
    planName: plan.planName,
    quota: plan.quota,
    features: { ...plan.features },
    interval: plan.interval,
    allowedTemplateIds,
    ...(plan.interval !== "one_time" || current?.subscriptionActive
      ? {
          subscriptionActive: true,
          // Sin valor previo se da un mes: si el admin sube a Premium para
          // probar y no se define la fecha, la cuenta quedaria "suscrita" para
          // siempre sin que nadie lo haya decidido.
          subscriptionExpiresAt:
            current?.subscriptionExpiresAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
        }
      : {}),
    updatedAt: Date.now(),
  };
}

/** Features efectivas de una invitación tras un cambio de plan de la cuenta. */
export function featuresDePlan(planId?: string | null): PlanFeatures {
  return getPlanFeatures(planId);
}
