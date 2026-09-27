// ============================================================================
// API /api/admin/ai-config
// GET  → config del asistente con la apiKey ENMASCARADA.
// PUT  → guarda la config (requiere rol admin).
// La apiKey nunca viaja en claro al navegador: si el cliente envía el valor
// enmascarado o lo deja vacío, se conserva la clave ya guardada.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { log } from "@/lib/logging";
import {
  getAiSettings,
  isApiKeyFromEnv,
  isMaskedApiKey,
  saveAiSettings,
  toPublicSettings,
} from "@/lib/ai/config";

export const runtime = "nodejs";

const COLLECTION = "aiConfig";
const DOC_ID = "global";

/** Verifica el Bearer token y que el usuario tenga role=admin en /users/{uid}. */
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

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [settings, fromEnv] = await Promise.all([getAiSettings(), isApiKeyFromEnv()]);
  return NextResponse.json(
    { settings: toPublicSettings(settings, { apiKeyFromEnv: fromEnv }) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { ...(body.settings ?? body) };
  delete patch.lastTest;
  delete patch.updatedAt;
  delete patch.updatedBy;

  // El input de la clave llega enmascarado: solo se reemplaza si el admin
  // escribe algo que NO sea la máscara (o si lo deja vacío a propósito).
  // Además se rechazan claves nuevas con caracteres fuera de ASCII (p. ej. €
  // colado al pegar): reventarían el header Authorization con un error opaco.
  const hasBadChars = (s: string) => /[^\x20-\x7E]/.test(s);
  const incomingKey = typeof patch.apiKey === "string" ? patch.apiKey.trim() : "";
  if (isMaskedApiKey(incomingKey)) delete patch.apiKey;
  if (incomingKey === "") delete patch.apiKey;
  if (typeof patch.apiKey === "string" && hasBadChars(patch.apiKey)) {
    return NextResponse.json(
      {
        error:
          "La API key nueva contiene un carácter no válido. Bórrala y pégala de nuevo con cuidado (las claves solo usan ASCII).",
      },
      { status: 400 }
    );
  }

  // Si viene la lista de proveedores, desmaskar las claves.
  // Se empareja con lo guardado por proveedor (+modelo), NO por índice: la
  // lista pudo reordenarse con los botones de prioridad.
  const incomingProviders = Array.isArray(patch.aiProviders) ? patch.aiProviders : null;
  if (incomingProviders) {
    const current = await getAiSettings();
    const oldProviders = current.aiProviders ?? [];
    const findOld = (provider: unknown, model: unknown) =>
      oldProviders.find(
        (o) =>
          o.provider === provider &&
          (typeof model === "string" && model.trim() ? o.model === model.trim() : true)
      ) ?? oldProviders.find((o) => o.provider === provider);
    for (const p of incomingProviders as any[]) {
      const key = typeof p?.apiKeyMasked === "string" ? p.apiKeyMasked : "";
      if (key && !isMaskedApiKey(key) && /[^\x20-\x7E]/.test(key)) {
        return NextResponse.json(
          {
            error: `La API key de "${p?.provider ?? "?"} contiene un carácter no válido. Bórrala y pégala de nuevo (solo ASCII).`,
          },
          { status: 400 }
        );
      }
    }
    patch.aiProviders = incomingProviders.map((p: any, i: number) => {
      const key = typeof p.apiKeyMasked === "string" ? p.apiKeyMasked : "";
      const old = findOld(p.provider, p.model);
      // Si la clave es la máscara o está vacía, conservar la original.
      const apiKey = isMaskedApiKey(key) || key === "" ? (old?.apiKey ?? "") : key;
      return {
        provider: p.provider,
        model: typeof p.model === "string" ? p.model : "",
        baseUrl: typeof p.baseUrl === "string" ? p.baseUrl : "",
        enabled: p.enabled !== false,
        priority: i,
        apiKey,
      };
    });
    // Sincronizar los campos single con el primer proveedor
    const first = (patch.aiProviders as any[])[0];
    if (first) {
      patch.provider = first.provider;
      patch.apiKey = first.apiKey;
      patch.model = first.model;
      patch.baseUrl = first.baseUrl;
    } else {
      // Lista vaciada a propósito: soltar los singles viejos para que nada resucite.
      delete patch.provider;
      delete patch.apiKey;
      delete patch.model;
      delete patch.baseUrl;
    }
  }

  try {
    const saved = await saveAiSettings(patch, admin);
    const fromEnv = await isApiKeyFromEnv();

    await log({
      action: "settings.updated",
      userId: admin.uid,
      userEmail: admin.email ?? undefined,
      userRole: "admin",
      targetId: `${COLLECTION}/${DOC_ID}`,
      targetType: "settings",
      metadata: { section: "asistente_ia", changed: Object.keys(patch) },
      description: `Admin actualizó la configuración del asistente IA (${Object.keys(patch).join(", ")})`,
      severity: "info",
    });

    return NextResponse.json({ settings: toPublicSettings(saved, { apiKeyFromEnv: fromEnv }) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error guardando" }, { status: 500 });
  }
}
