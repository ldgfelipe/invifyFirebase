// ============================================================================
// API /api/admin/ai-config/test
// POST → hace una llamada mínima al proveedor configurado para verificar que la
// credencial, la base y el modelo responden. Habla el formato que corresponda
// (OpenAI-compatible o Gemini) a través del cliente común. Guarda el resultado
// en la config para que el panel muestre el último estado. Requiere rol admin.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getAiSettings } from "@/lib/ai/config";
import { isMaskedApiKey } from "@/lib/ai/config";
import { extractJson } from "@/lib/ai/client";
import { isKnownProvider, isUsableBaseUrl, resolveProvider } from "@/lib/ai/providers";
import { normalizeAiSettings } from "@/lib/ai/config";
import type { AiSettings, AiTestResult, AiProviderConfig } from "@/lib/types";

export const runtime = "nodejs";

async function requireAdmin(req: NextRequest): Promise<{ uid: string; email: string | null } | null> {
  const raw = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!raw) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(raw);
    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!snap.exists || snap.data()?.role !== "admin") return null;
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

const TEST_PROMPT =
  'Responde únicamente con este JSON: {"ok":true,"message":"conexion_ok"}';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const settings = await getAiSettings();

  // Si viene providerConfig, se prueba ese proveedor concreto (botón "Probar" de la lista).
  const providerConfig = (body.providerConfig ?? null) as {
    provider?: unknown;
    apiKey?: unknown;
    baseUrl?: unknown;
    model?: unknown;
  } | null;
  const provider =
    (providerConfig && isKnownProvider(providerConfig.provider)
      ? (providerConfig.provider as AiProviderConfig["provider"])
      : null) ??
    (typeof body.provider === "string" ? body.provider : settings.provider);
  const preset = resolveProvider(provider);

  // La clave guardada nunca viaja al navegador: el panel envía la máscara.
  // Si llega máscara (o vacío), se recupera la clave real del proveedor
  // guardado con el mismo id (y modelo si hay varios del mismo proveedor).
  const savedList = settings.aiProviders ?? [];
  const savedMatch =
    savedList.find(
      (p) =>
        p.provider === preset.id &&
        (typeof providerConfig?.model === "string" && providerConfig.model.trim()
          ? p.model === (providerConfig.model as string).trim()
          : true)
    ) ?? savedList.find((p) => p.provider === preset.id);
  const rawKey =
    (typeof body.apiKey === "string" && body.apiKey.trim()) ||
    (typeof providerConfig?.apiKey === "string" ? (providerConfig.apiKey as string).trim() : "");
  const apiKey =
    rawKey && !isMaskedApiKey(rawKey)
      ? rawKey
      : (savedMatch?.apiKey && !isMaskedApiKey(savedMatch.apiKey)
          ? savedMatch.apiKey
          : providerConfig
            ? ""
            : settings.apiKey);

  const baseUrlRaw = providerConfig
    ? (typeof providerConfig.baseUrl === "string" && (providerConfig.baseUrl as string).trim()) ||
      savedMatch?.baseUrl ||
      ""
    : (typeof body.baseUrl === "string" && body.baseUrl.trim()) || settings.baseUrl;
  const baseUrl = baseUrlRaw || preset.baseUrl;
  const model = providerConfig
    ? (typeof providerConfig.model === "string" && (providerConfig.model as string).trim()) ||
      savedMatch?.model ||
      preset.defaultModel
    : (typeof body.model === "string" && body.model.trim()) || settings.model || preset.defaultModel;

  // Validar: la clave debe estar presente para este proveedor
  if (!apiKey && preset.requiresKey) {
    const storedBroken = savedMatch?.apiKey ? isMaskedApiKey(savedMatch.apiKey) : false;
    return NextResponse.json(
      {
        error: storedBroken
          ? `La clave guardada de ${preset.label} parece una máscara corrupta, no una clave real. Borra el campo y escribe la clave de nuevo, guarda y vuelve a probar.`
          : `Falta la API key de ${preset.label}. Escribe una o guárdala antes de probar.`,
      },
      { status: 400 }
    );
  }
  if (apiKey && /[^\x20-\x7E]/.test(apiKey)) {
    const bad = apiKey.match(/[^\x20-\x7E]/)?.[0] ?? "?";
    return NextResponse.json(
      {
        error:
          `La API key de ${preset.label} contiene un carácter no válido ("${bad}"). ` +
          `Borra el campo de la clave y pégala de nuevo con cuidado (las claves solo usan ASCII).`,
      },
      { status: 400 }
    );
  }
  if (!model) {
    return NextResponse.json({ error: `Falta el modelo para ${preset.label}.` }, { status: 400 });
  }
  if (!isUsableBaseUrl(baseUrl)) {
    return NextResponse.json(
      { error: `Base URL inválida. Debe empezar por http:// o https:// y no dejar {account_id} sin reemplazar.` },
      { status: 400 }
    );
  }

  const candidate = normalizeAiSettings(
    { ...settings, provider: preset.id, baseUrl, model, apiKey },
    settings
  ) as AiSettings;

  const startedAt = Date.now();
  let result: AiTestResult;

  try {
    const { chatCompletion } = await import("@/lib/ai/client");

    const { raw, latencyMs } = await chatCompletion(
      candidate,
      [{ role: "user", content: TEST_PROMPT }],
      { timeoutMs: 25_000, forceJson: true }
    );

    const json = extractJson(raw);
    result = json?.ok
      ? { ok: true, model, latencyMs, at: Date.now(), message: `Conexión correcta con ${preset.label}.` }
      : {
          ok: false,
          model,
          latencyMs,
          at: Date.now(),
          message: `El proveedor respondió pero sin JSON válido: ${raw.slice(0, 160) || "(vacío)"}`,
        };
  } catch (err: any) {
    result = {
      ok: false,
      model,
      latencyMs: Date.now() - startedAt,
      at: Date.now(),
      message:
        err?.name === "AbortError"
          ? "Timeout: el proveedor tardó más de 25 s."
          : `Error: ${err?.message ?? "desconocido"}`,
    };
  }

  // Persiste el resultado del test (no la clave).
  await adminDb.collection("aiConfig").doc("global").set({ lastTest: result }, { merge: true });

  return NextResponse.json({ result });
}
