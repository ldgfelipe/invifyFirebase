// ============================================================================
// AI - ConfiguraciÃ³n del asistente.
// Prioridad: /aiConfig/global (Firestore, vÃ­a Admin SDK) > env vars.
// Este mÃ³dulo SOLO corre en servidor: es el Ãºnico lugar donde la apiKey se
// lee en claro. El cliente recibe siempre una versiÃ³n enmascarada.
// ============================================================================
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AiProviderConfig, AiSettings, AiSettingsPublic } from "@/lib/types";
import { isKnownProvider, resolveProvider } from "./providers";
import { chatCompletion, isProviderReady, type ChatMessage } from "./client";

const DOC_PATH = { collection: "aiConfig", docId: "global" } as const;

/** Reexportados para no romper los imports existentes. */
export { extractJson, isProviderReady } from "./client";
export { AI_DEFAULT_BASE_URL, AI_DEFAULT_MODEL } from "./constants";

import { AI_DEFAULT_BASE_URL, AI_DEFAULT_MODEL } from "./constants";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: "openai",
  apiKey: "",
  baseUrl: AI_DEFAULT_BASE_URL,
  model: AI_DEFAULT_MODEL,
  aiProviders: [],
  temperature: 0.6,
  maxTokens: 2000,
  systemPrompt:
    "Eres un diseÃ±ador web experto en invitaciones digitales. " +
    "Creas plantillas elegantes, modernas y coherentes con la combinaciÃ³n de color solicitada, " +
    "respetando siempre la estructura JSON indicada.",
  customInstructions:
    "- Prioriza legibilidad y jerarquÃ­a visual.\n" +
    "- Usa textos breves y emotivos, nunca lorem ipsum.\n" +
    "- MantÃ©n la paleta dentro de los colores indicados en theme.",
  languageMode: "auto",
  fallbackToMock: true,
  imageSource: "local",
  maxGenerationsPerDay: 0,
  defaultNames: "Ana & Carlos",
  defaultNamesEn: "Ana & Carlos",
};

const clamp = (n: unknown, min: number, max: number, fallback: number): number => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
};

const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v : fallback;

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

/** Normaliza cualquier objeto (Firestore o request) a un AiSettings vÃ¡lido. */
export function normalizeAiSettings(raw: unknown, base: AiSettings = DEFAULT_AI_SETTINGS): AiSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const provider = isKnownProvider(r.provider) ? r.provider : base.provider;
  const languageMode =
    r.languageMode === "es" || r.languageMode === "en" ? r.languageMode : "auto";
  const imageSource = r.imageSource === "picsum" ? "picsum" : "local";

  const existingProviders: AiProviderConfig[] = Array.isArray(r.aiProviders)
    ? (r.aiProviders as Array<Record<string, unknown>>)
        .filter((p) => p && isKnownProvider((p as Record<string, unknown>).provider))
        .map((p) => {
          const q = p as Record<string, unknown>;
          const preset = resolveProvider(q.provider);
          const rawKey = typeof q.apiKey === "string" ? q.apiKey.trim() : "";
          return {
            provider: preset.id,
            // Solo campos conocidos: nunca persistir apiKeyMasked ni lastTest.
            // Una máscara guardada por error (• o â€¢) no es clave: se vacía
            // para que el proveedor se salte con un mensaje claro.
            apiKey: isMaskedApiKey(rawKey) ? "" : rawKey,
            model:
              typeof q.model === "string" && q.model.trim()
                ? q.model.trim()
                : preset.defaultModel,
            baseUrl:
              typeof q.baseUrl === "string" ? q.baseUrl.trim().replace(/\/+$/, "") : "",
            enabled: q.enabled !== false,
            priority: Number.isFinite(Number(q.priority)) ? Number(q.priority) : 0,
          };
        })
    : [];

  let aiProviders: AiProviderConfig[];
  if (Array.isArray(r.aiProviders)) {
    // Lista explícita (aunque esté vacía: el admin eliminó todo).
    aiProviders = [...existingProviders]
      .sort((a, b) => a.priority - b.priority)
      .map((p, i) => ({ ...p, priority: i }));
  } else {
    // Migración legacy: un solo proveedor.
    const legacyKey = typeof r.apiKey === "string" ? r.apiKey.trim() : base.apiKey;
    aiProviders = [{
      provider,
      apiKey: isMaskedApiKey(legacyKey) ? "" : legacyKey,
      model: str(r.model, base.model),
      baseUrl: str(r.baseUrl, base.baseUrl).replace(/\/+$/, ""),
      enabled: true,
      priority: 0,
    }];
  }

  const first = aiProviders[0];

  return {
    enabled: bool(r.enabled, base.enabled),
    provider: first?.provider ?? base.provider,
    apiKey: first?.apiKey ?? "",
    baseUrl: first ? first.baseUrl || resolveProvider(first.provider).baseUrl : "",
    model: first?.model ?? "",
    aiProviders,
    temperature: clamp(r.temperature, 0, 2, base.temperature),
    maxTokens: Math.round(clamp(r.maxTokens, 64, 16000, base.maxTokens)),
    systemPrompt: typeof r.systemPrompt === "string" ? r.systemPrompt : base.systemPrompt,
    customInstructions:
      typeof r.customInstructions === "string" ? r.customInstructions : base.customInstructions,
    languageMode,
    fallbackToMock: bool(r.fallbackToMock, base.fallbackToMock),
    imageSource,
    maxGenerationsPerDay: Math.round(clamp(r.maxGenerationsPerDay, 0, 100000, base.maxGenerationsPerDay)),
    defaultNames: str(r.defaultNames, base.defaultNames),
    defaultNamesEn: str(r.defaultNames_en ?? r.defaultNamesEn, base.defaultNamesEn),
    lastTest: (r.lastTest as AiSettings["lastTest"]) ?? base.lastTest,
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : base.updatedAt,
    updatedBy: typeof r.updatedBy === "string" ? r.updatedBy : base.updatedBy,
  };
}

function fromEnv(): Partial<AiSettings> {
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GROQ_API_KEY ||
    "";
  if (!apiKey) return {};

  // Permite desplegar preconfigurado sin pasar por el panel. El proveedor fija
  // la baseUrl y el modelo por defecto solo si no vienen dados.
  const preset = isKnownProvider(process.env.AI_PROVIDER)
    ? resolveProvider(process.env.AI_PROVIDER)
    : null;

  return {
    apiKey,
    model: process.env.AI_MODEL || preset?.defaultModel || AI_DEFAULT_MODEL,
    baseUrl: process.env.AI_BASE_URL || preset?.baseUrl || AI_DEFAULT_BASE_URL,
    ...(preset ? { provider: preset.id } : {}),
  };
}

/** Lee el documento crudo de Firestore, sin aplicar el fallback del entorno. */
async function readStoredDoc(): Promise<Record<string, unknown>> {
  try {
    const snap = await adminDb.collection(DOC_PATH.collection).doc(DOC_PATH.docId).get();
    return snap.exists ? ((snap.data() ?? {}) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
  * Carga la config efectiva del asistente.
  * Always returns a complete object; never throws.
  */
export async function getAiSettings(): Promise<AiSettings> {
  const stored = await readStoredDoc();

  const env = fromEnv();
  // La config guardada manda; la env solo rellena lo que falte.
  const merged = { ...env, ...stored, apiKey: str(stored.apiKey, env.apiKey ?? "") };
  return normalizeAiSettings(merged, { ...DEFAULT_AI_SETTINGS, ...env });
}

/**
  * Indica si la apiKey proviene de una variable de entorno (no editable en el
  * panel). Debe leer el documento crudo: getAiSettings() ya resolviÃ³ el fallback
  * del entorno, asÃ­ que consultarla devolverÃ­a siempre false.
  */
export async function isApiKeyFromEnv(): Promise<boolean> {
  const envKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
  if (!envKey) return false;
  const stored = await readStoredDoc();
  return !str(stored.apiKey, "");
}

/** Viñeta real de enmascarado (• U+2022) y resto corrupto histórico (â€¢). */
export const MASK_BULLET = "•";
const MASK_BULLET_LEGACY = "â€¢";

/** Indica si un valor es (o parece) una máscara en vez de una clave real. */
export function isMaskedApiKey(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  return value.includes(MASK_BULLET) || value.includes(MASK_BULLET_LEGACY);
}

/** Enmascara una clave para poder mostrarla sin exponerla. */
export function maskApiKey(key: string): string {
  if (!key) return "";
  if (isMaskedApiKey(key)) return "";
  if (key.length <= 11) return MASK_BULLET.repeat(key.length);
  return `${key.slice(0, 6)}${MASK_BULLET.repeat(8)}${key.slice(-4)}`;
}

/** Enmascara las claves de cada proveedor de la lista (sin exponer apiKey). */
function maskProviders(
  providers: AiProviderConfig[]
): Array<Omit<AiProviderConfig, "apiKey"> & { apiKeyMasked: string }> {
  return providers.map((p) => ({
    provider: p.provider,
    model: p.model,
    baseUrl: p.baseUrl ?? "",
    enabled: p.enabled !== false,
    priority: p.priority,
    apiKeyMasked: maskApiKey(p.apiKey),
  }));
}

/** Proyecta la config a la vista pÃºblica (sin la clave en claro). */
export function toPublicSettings(
  settings: AiSettings,
  opts: { apiKeyFromEnv?: boolean } = {}
): AiSettingsPublic {
  const { apiKey, aiProviders, ...rest } = settings;
  return {
    ...rest,
    apiKeyMasked: maskApiKey(apiKey),
    hasApiKey: Boolean(apiKey),
    apiKeyFromEnv: Boolean(opts.apiKeyFromEnv),
    aiProviders: maskProviders(aiProviders || []),
  };
}

/** Persiste la config. Solo la debe llamar el Admin SDK desde una ruta de API. */
export async function saveAiSettings(
  patch: unknown,
  admin: { uid: string; email?: string | null }
): Promise<AiSettings> {
  const current = await getAiSettings();
  const next = normalizeAiSettings({ ...current, ...(patch as Record<string, unknown>) }, current);
  next.updatedAt = Date.now();
  next.updatedBy = admin.email || admin.uid;

  // Asegurar que los campos single se mantienen sincronizados con aiProviders[0]
  const first = next.aiProviders?.[0];
  if (first) {
    next.provider = first.provider;
    next.apiKey = first.apiKey;
    next.model = first.model;
    next.baseUrl = first.baseUrl || resolveProvider(first.provider).baseUrl;
  }

  const data: Record<string, unknown> = { ...next, defaultNames_en: next.defaultNamesEn };
  if ((patch as Record<string, unknown>)?.aiProviders !== undefined) {
    // La lista cambió (o se vació): el último test es de otra configuración.
    data.lastTest = FieldValue.delete();
    next.lastTest = undefined;
  } else if (data.lastTest === undefined) {
    delete data.lastTest;
  }

  await adminDb
    .collection(DOC_PATH.collection)
    .doc(DOC_PATH.docId)
    .set(data, { merge: true });

  return next;
}

/**
  * Indica si hay al menos un proveedor activo listo para llamar (clave, base y
  * modelo válidos según su preset). A diferencia de isProviderReady —que solo
  * mira el proveedor principal—, este recorre toda la lista con fallback.
  */
export function isAnyProviderReady(settings: AiSettings): boolean {
  if (!settings.enabled) return false;
  const list = (settings.aiProviders ?? []).filter((p) => p.enabled !== false);
  if (list.length > 0) {
    return list.some((p) =>
      isProviderReady({
        ...settings,
        provider: p.provider,
        apiKey: p.apiKey,
        model: p.model,
        baseUrl: p.baseUrl || resolveProvider(p.provider).baseUrl,
      })
    );
  }
  return isProviderReady(settings);
}

/**
  * Llama al proveedor con mayor prioridad; si falla, intenta con los
  * siguientes en orden. Solo intenta los marcados como activos.
  * Devuelve null si todos fallan o la IA está apagada.
  */
export async function callAi(
  settings: AiSettings,
  messages: ChatMessage[],
  opts?: { timeoutMs?: number; forceJson?: boolean }
): Promise<{ json: any; raw: string; latencyMs: number } | null> {
  if (!settings.enabled) return null;
  const enabledProviders = (settings.aiProviders ?? []).filter((p) => p.enabled !== false);
  const providers =
    enabledProviders.length > 0
      ? [...enabledProviders].sort((a, b) => a.priority - b.priority)
      : null;

  const attempts = providers || [
    { provider: settings.provider, apiKey: settings.apiKey, model: settings.model, baseUrl: settings.baseUrl },
  ];

  const timeoutMs = opts?.timeoutMs ?? 60_000;
  for (const p of attempts) {
    const s = { ...settings, provider: p.provider, apiKey: p.apiKey, model: p.model, baseUrl: p.baseUrl || resolveProvider(p.provider).baseUrl };
    if (!isProviderReady(s)) continue;
    try {
      return await chatCompletion(s, messages, { timeoutMs, forceJson: opts?.forceJson });
    } catch {
      continue;
    }
  }
  return null;
}

