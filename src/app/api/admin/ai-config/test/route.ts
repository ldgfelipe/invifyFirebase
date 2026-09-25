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
import { extractJson } from "@/lib/ai/client";
import { isUsableBaseUrl, resolveProvider } from "@/lib/ai/providers";
import { normalizeAiSettings } from "@/lib/ai/config";
import type { AiSettings, AiTestResult } from "@/lib/types";

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

  // Permite probar una clave/modelo SIN guardarlo antes (opción "probar" del form).
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const settings = await getAiSettings();
  const provider = typeof body.provider === "string" ? body.provider : settings.provider;
  const preset = resolveProvider(provider);

  // Base y modelo propuestos por el preset, para poder probar un proveedor nuevo
  // sin escribir antes los valores a mano.
  const baseUrl =
    (typeof body.baseUrl === "string" && body.baseUrl.trim() ? body.baseUrl.trim() : settings.baseUrl) ||
    preset.baseUrl;
  const model =
    (typeof body.model === "string" && body.model.trim()) || settings.model || preset.defaultModel;
  const apiKey =
    typeof body.apiKey === "string" && body.apiKey.trim() && !body.apiKey.includes("•")
      ? body.apiKey.trim()
      : settings.apiKey;

  const candidate = normalizeAiSettings(
    { ...settings, provider: preset.id, baseUrl, model, apiKey },
    settings
  ) as AiSettings;

  if (!isUsableBaseUrl(candidate.baseUrl)) {
    return NextResponse.json(
      { error: `Base URL inválida. Debe empezar por http:// o https:// y no dejar {account_id} sin reemplazar.` },
      { status: 400 }
    );
  }
  if (!apiKey && preset.requiresKey) {
    return NextResponse.json(
      { error: `Falta la API key de ${preset.label}. Escribe una o guárdala antes de probar.` },
      { status: 400 }
    );
  }
  if (!model) {
    return NextResponse.json({ error: `Falta el modelo para ${preset.label}.` }, { status: 400 });
  }

  const startedAt = Date.now();
  let result: AiTestResult;

  try {
    // Import diferido: el cliente arrastra dependencias de red y no hace falta
    // para responder los errores de validación de arriba.
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
