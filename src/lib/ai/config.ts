// ============================================================================
// AI - ConfiguraciÃ³n del asistente.
// Prioridad: /aiConfig/global (Firestore, vÃ­a Admin SDK) > env vars.
// Este mÃ³dulo SOLO corre en servidor: es el Ãºnico lugar donde la apiKey se
// lee en claro. El cliente recibe siempre una versiÃ³n enmascarada.
// ============================================================================
import { adminDb } from "@/lib/firebase/admin";
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
    ? (r.aiProviders as AiProviderConfig[]).filter(
        (p: AiProviderConfig) => p && isKnownProvider(p.provider)
      )
    : [];

  let aiProviders: AiProviderConfig[];
  if (existingProviders.length > 0) {
    // Ordenar por priority y re-numerar
    aiProviders = existingProviders.sort((a, b) => a.priority - b.priority);
    aiProviders = aiProviders.map((p, i) => ({ ...p, priority: i }));
  } else {
    // MigraciÃ³n legacy: un solo proveedor.
    aiProviders = [{
      provider,
      apiKey: typeof r.apiKey === "string" ? r.apiKey.trim() : base.apiKey,
      model: str(r.model, base.model),
      baseUrl: str(r.baseUrl, base.baseUrl).replace(/\/+$/, ""),
      enabled: true,
      priority: 0,
    }];
  }

  const first = aiProviders[0];

  return {
    enabled: bool(r.enabled, base.enabled),
    provider: first.provider,
    apiKey: first.apiKey,
    baseUrl: first.baseUrl || resolveProvider(first.provider).baseUrl,
    model: first.model,
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

/** Enmascara una clave para poder mostrarla sin exponerla. */
export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 11) return "â€¢".repeat(key.length);
  return `${key.slice(0, 6)}${"â€¢".repeat(8)}${key.slice(-4)}`;
}

/** Enmascara las claves de cada proveedor de la lista. */
function maskProviders(providers: AiProviderConfig[]): Array<AiProviderConfig & { apiKeyMasked: string }> {
  return providers.map((p) => ({ ...p, apiKeyMasked: maskApiKey(p.apiKey) }));
}

/** Proyecta la config a la vista pÃºblica (sin la clave en claro). */
export function toPublicSettings(
  settings: AiSettings,
  opts: { apiKeyFromEnv?: boolean } = {}
): AiSettingsPublic {
  const { apiKey, ...rest } = settings;
  return {
    ...rest,
    apiKeyMasked: maskApiKey(apiKey),
    hasApiKey: Boolean(apiKey),
    apiKeyFromEnv: Boolean(opts.apiKeyFromEnv),
    aiProviders: maskProviders(settings.aiProviders || []),
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

  await adminDb
    .collection(DOC_PATH.collection)
    .doc(DOC_PATH.docId)
    .set({ ...next, defaultNames_en: next.defaultNamesEn }, { merge: true });

  return next;
}

/**
  * Llama al proveedor con mayor prioridad; si falla, intenta con los
  * siguientes en orden. Devuelve null si todos fallan o la IA estÃ¡ apagada.
  */
export async function callAi(
  settings: AiSettings,
  messages: ChatMessage[],
  opts?: { timeoutMs?: number; forceJson?: boolean }
): Promise<{ json: any; raw: string; latencyMs: number } | null> {
  if (!settings.enabled) return null;
  const providers = (settings.aiProviders ?? []).length > 0
    ? [...(settings.aiProviders ?? [])].sort((a, b) => a.priority - b.priority)
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

