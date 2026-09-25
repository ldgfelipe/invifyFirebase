// ============================================================================
// AI - Configuración del asistente.
// Prioridad: /aiConfig/global (Firestore, vía Admin SDK) > env vars.
// Este módulo SOLO corre en servidor: es el único lugar donde la apiKey se
// lee en claro. El cliente recibe siempre una versión enmascarada.
// ============================================================================
import { adminDb } from "@/lib/firebase/admin";
import type { AiSettings, AiSettingsPublic } from "@/lib/types";

const DOC_PATH = { collection: "aiConfig", docId: "global" } as const;

export const AI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const AI_DEFAULT_MODEL = "gpt-4o-mini";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: "openai",
  apiKey: "",
  baseUrl: AI_DEFAULT_BASE_URL,
  model: AI_DEFAULT_MODEL,
  temperature: 0.6,
  maxTokens: 2000,
  systemPrompt:
    "Eres un diseñador web experto en invitaciones digitales. " +
    "Creas plantillas elegantes, modernas y coherentes con la combinación de color solicitada, " +
    "respetando siempre la estructura JSON indicada.",
  customInstructions:
    "- Prioriza legibilidad y jerarquía visual.\n" +
    "- Usa textos breves y emotivos, nunca lorem ipsum.\n" +
    "- Mantén la paleta dentro de los colores indicados en theme.",
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

/** Normaliza cualquier objeto (Firestore o request) a un AiSettings válido. */
export function normalizeAiSettings(raw: unknown, base: AiSettings = DEFAULT_AI_SETTINGS): AiSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const provider = r.provider === "openai-compatible" ? "openai-compatible" : "openai";
  const languageMode =
    r.languageMode === "es" || r.languageMode === "en" ? r.languageMode : "auto";
  const imageSource = r.imageSource === "picsum" ? "picsum" : "local";

  return {
    enabled: bool(r.enabled, base.enabled),
    provider,
    apiKey: typeof r.apiKey === "string" ? r.apiKey.trim() : base.apiKey,
    baseUrl: str(r.baseUrl, base.baseUrl).replace(/\/+$/, ""),
    model: str(r.model, base.model),
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
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
  if (!apiKey) return {};
  return { apiKey, model: process.env.AI_MODEL || AI_DEFAULT_MODEL };
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
 * panel). Debe leer el documento crudo: getAiSettings() ya resolvió el fallback
 * del entorno, así que consultarla devolvería siempre false.
 */
export async function isApiKeyFromEnv(): Promise<boolean> {
  const envKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
  if (!envKey) return false;
  const stored = await readStoredDoc();
  return !str(stored.apiKey, "");
}

/** Enmascara la clave para poder mostrarla sin exponerla. */
export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 11) return "•".repeat(key.length);
  return `${key.slice(0, 6)}${"•".repeat(8)}${key.slice(-4)}`;
}

/** Proyecta la config a la vista pública (sin la clave en claro). */
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

  await adminDb
    .collection(DOC_PATH.collection)
    .doc(DOC_PATH.docId)
    .set({ ...next, defaultNames_en: next.defaultNamesEn }, { merge: true });

  return next;
}

/**
 * Llama al proveedor configurado. Devuelve null si la IA está apagada,
 * no hay credencial, o si la respuesta no trae JSON válido.
 */
export async function callAi(
  settings: AiSettings,
  messages: { role: "system" | "user"; content: string }[]
): Promise<{ json: any; raw: string; latencyMs: number } | null> {
  if (!settings.enabled || !settings.apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  const startedAt = Date.now();

  try {
    const res = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`);
    }

    const data: any = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const json = extractJson(raw);
    return { json, raw, latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

/** Extrae el primer objeto JSON balanceado de un texto. */
export function extractJson(content: string): any | null {
  const start = content.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(content.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
