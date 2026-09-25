// ============================================================================
// AI - Cliente HTTP multi-proveedor.
// Dos adaptadores: "openai" (POST {baseUrl}/chat/completions) cubre a la
// mayoría de proveedores, y "gemini" (models/{modelo}:generateContent).
// Ningún otro proveedor necesita código propio: entra por el mismo adaptador.
// ============================================================================
import type { AiSettings } from "@/lib/types";
import { isUsableBaseUrl, resolveProvider } from "./providers";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface ChatResult {
  json: any;
  raw: string;
  latencyMs: number;
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

/** Config lista para llamar: aplica defaults y valida la URL base. */
export function isProviderReady(settings: AiSettings): boolean {
  if (!settings.enabled) return false;
  const preset = resolveProvider(settings.provider);
  if (preset.requiresKey && !settings.apiKey) return false;
  if (!isUsableBaseUrl(settings.baseUrl)) return false;
  return Boolean(settings.model);
}

const truncate = (s: string, n = 300) => s.slice(0, n);

/**
 * Detecta una Base URL que ya trae el endpoint puesto (…/v1/responses,
 * …/v1/models, …/chat/completions). Invify siempre añade el endpoint, así que
 * el resultado sería un 404 del proveedor del tipo "No handler found on route",
 * que no dice nada útil. Es un error de tecleo fácil de cometer.
 */
const ENDPOINT_SUFFIX =
  /\/(chat\/completions|completions|responses|messages|embeddings|models|generateContent)$/i;

export function baseUrlLooksComplete(baseUrl: string): string | null {
  try {
    const { pathname } = new URL(baseUrl);
    return pathname.match(ENDPOINT_SUFFIX)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function readError(res: Response): Promise<string> {
  const detail = await res.text().catch(() => "");
  return `HTTP ${res.status} ${res.statusText}${detail ? ` — ${truncate(detail)}` : ""}`;
}

// ------------------------------- Adaptador OpenAI -------------------------------

async function chatOpenAi(
  settings: AiSettings,
  messages: ChatMessage[],
  timeoutMs: number,
  forceJson: boolean
): Promise<{ raw: string; latencyMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  const preset = resolveProvider(settings.provider);
  const wantsJson = forceJson && preset.wire === "openai";

  const send = async (withResponseFormat: boolean) => {
    const res = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        // Los proveedores locales (Ollama, LM Studio) no llevan credencial.
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        ...(withResponseFormat ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    });
    if (!res.ok) {
      const err: any = new Error(await readError(res));
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  try {
    let data: any;
    try {
      data = await send(wantsJson);
    } catch (err: any) {
      // Algunos proveedores compatibles no aceptan response_format y responden
      // 400. Se reintenta sin él antes de rendirse.
      const canRetry = err?.status === 400 && wantsJson && String(err?.message).includes("response_format");
      if (!canRetry) throw err;
      data = await send(false);
    }
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    return { raw, latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------- Adaptador Gemini -------------------------------

async function chatGemini(
  settings: AiSettings,
  messages: ChatMessage[],
  timeoutMs: number
): Promise<{ raw: string; latencyMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  // Gemini separa la instrucción de sistema del resto.
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  try {
    const res = await fetch(
      `${settings.baseUrl}/models/${encodeURIComponent(settings.model)}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": settings.apiKey,
        },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: {
            temperature: settings.temperature,
            maxOutputTokens: settings.maxTokens,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) throw new Error(await readError(res));

    const data: any = await res.json();
    const raw: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
    return { raw, latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------ Dispatch ------------------------------------

/**
 * Llama al proveedor configurado y devuelve el JSON balanceado de la respuesta.
 * Lanza si el proveedor no está listo o si la llamada falla.
 */
export async function chatCompletion(
  settings: AiSettings,
  messages: ChatMessage[],
  opts: { timeoutMs?: number; forceJson?: boolean } = {}
): Promise<ChatResult> {
  const { timeoutMs = 60_000, forceJson = true } = opts;
  const preset = resolveProvider(settings.provider);

    if (!isUsableBaseUrl(settings.baseUrl)) {
    throw new Error(
      `Base URL inválida para ${preset.label}. Debe empezar por http:// o https://` +
        (settings.baseUrl.includes("{") ? " y no dejar placeholders como {account_id} sin reemplazar." : ".")
    );
  }

  const alreadyComplete = baseUrlLooksComplete(settings.baseUrl);
  if (alreadyComplete) {
    const base = settings.baseUrl.replace(/\/[^/]+$/, "");
    throw new Error(
      `La Base URL ya incluye el endpoint "${alreadyComplete}". ` +
        `Escribe solo la base: ${base || "(vacía)"}. El endpoint lo añade Invify por ti.`
    );
  }


  if (!settings.apiKey && preset.requiresKey) {
    throw new Error(`Falta la API key de ${preset.label}.`);
  }
  if (!settings.model) {
    throw new Error(`Falta el modelo para ${preset.label}.`);
  }

  const { raw, latencyMs } =
    preset.wire === "gemini"
      ? await chatGemini(settings, messages, timeoutMs)
      : await chatOpenAi(settings, messages, timeoutMs, forceJson);

  return { json: extractJson(raw), raw, latencyMs };
}

/**
 * Lista el catálogo de modelos del proveedor (GET {baseUrl}/models).
 * Devuelve null si el endpoint no existe o no está permitido, para que la UI
 * pueda recurrir a las sugerencias sin tratar eso como error.
 */
export async function listModels(
  settings: Pick<AiSettings, "provider" | "baseUrl" | "apiKey">
): Promise<string[] | null> {
  const preset = resolveProvider(settings.provider);
  if (!preset.canListModels || !isUsableBaseUrl(settings.baseUrl)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const isGemini = preset.wire === "gemini";
    const res = await fetch(`${settings.baseUrl}/models`, {
      signal: controller.signal,
      headers: {
        ...(settings.apiKey
          ? isGemini
            ? { "x-goog-api-key": settings.apiKey }
            : { Authorization: `Bearer ${settings.apiKey}` }
          : {}),
      },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const ids: string[] = isGemini
      ? (data?.models ?? []).map((m: any) => String(m?.name ?? "").replace(/^models\//, ""))
      : (data?.data ?? []).map((m: any) => String(m?.id ?? ""));
    const filtered = ids
      .filter(Boolean)
      // Gemini lista también embeddings y moderación, que no sirven aquí.
      .filter((id) => !/embedding|moderation|image|tts|whisper/i.test(id));
    return [...new Set(filtered)].sort();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
