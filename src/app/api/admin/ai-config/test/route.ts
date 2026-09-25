// ============================================================================
// API /api/admin/ai-config/test
// POST → hace una llamada mínima al proveedor configurado para verificar que la
// credencial y el modelo responden. Guarda el resultado en la config para que el
// panel muestre el último estado. Requiere rol admin.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getAiSettings, extractJson, AI_DEFAULT_BASE_URL, AI_DEFAULT_MODEL } from "@/lib/ai/config";
import type { AiTestResult } from "@/lib/types";

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
  const baseUrl =
    typeof body.baseUrl === "string" && body.baseUrl.trim()
      ? body.baseUrl.trim().replace(/\/+$/, "")
      : settings.baseUrl || AI_DEFAULT_BASE_URL;
  const model =
    (typeof body.model === "string" && body.model.trim()) || settings.model || AI_DEFAULT_MODEL;
  const apiKey =
    typeof body.apiKey === "string" && body.apiKey.trim() && !body.apiKey.includes("•")
      ? body.apiKey.trim()
      : settings.apiKey;

  if (!apiKey) {
    return NextResponse.json(
      { error: "No hay API key. Escribe una o guárdala antes de probar." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  const startedAt = Date.now();
  let result: AiTestResult;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 60,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: TEST_PROMPT }],
      }),
    });

    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      result = {
        ok: false,
        model,
        latencyMs,
        at: Date.now(),
        message: `HTTP ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`,
      };
    } else {
      const data: any = await res.json();
      const raw: string = data?.choices?.[0]?.message?.content ?? "";
      const json = extractJson(raw);
      result = json?.ok
        ? { ok: true, model, latencyMs, at: Date.now(), message: "Conexión correcta." }
        : {
            ok: false,
            model,
            latencyMs,
            at: Date.now(),
            message: `El proveedor respondió pero sin JSON válido: ${raw.slice(0, 160) || "(vacío)"}`,
          };
    }
  } catch (err: any) {
    result = {
      ok: false,
      model,
      latencyMs: Date.now() - startedAt,
      at: Date.now(),
      message:
        err?.name === "AbortError"
          ? "Timeout: el proveedor tardó más de 25 s."
          : `Error de red: ${err?.message ?? "desconocido"}`,
    };
  } finally {
    clearTimeout(timer);
  }

  // Persiste el resultado del test (no la clave).
  await adminDb.collection("aiConfig").doc("global").set({ lastTest: result }, { merge: true });

  return NextResponse.json({ result });
}
