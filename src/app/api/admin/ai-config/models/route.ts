// ============================================================================
// API /api/admin/ai-config/models
// POST → lista el catálogo de modelos del proveedor indicado (GET {base}/models).
// Es lo que permite cubrir "la mayor cantidad de modelos": el admin elige
// proveedor y ve exactamente los modelos que su clave puede usar, en vez de
// depender de una lista fija. Requiere rol admin.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getAiSettings } from "@/lib/ai/config";
import { listModels } from "@/lib/ai/client";
import { isUsableBaseUrl, resolveProvider } from "@/lib/ai/providers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const raw = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!raw) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(raw)).uid;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const settings = await getAiSettings();
  const provider = typeof body.provider === "string" ? body.provider : settings.provider;
  const preset = resolveProvider(provider);
  const baseUrl =
    (typeof body.baseUrl === "string" && body.baseUrl.trim() ? body.baseUrl.trim() : settings.baseUrl) ||
    preset.baseUrl;
  const apiKey =
    typeof body.apiKey === "string" && body.apiKey.trim() && !body.apiKey.includes("•")
      ? body.apiKey.trim()
      : settings.apiKey;

  if (!isUsableBaseUrl(baseUrl)) {
    return NextResponse.json(
      { error: "Completa la Base URL antes de cargar los modelos." },
      { status: 400 }
    );
  }
  if (!apiKey && preset.requiresKey) {
    return NextResponse.json(
      { error: `${preset.label} necesita una API key para listar modelos.` },
      { status: 400 }
    );
  }

  try {
    const models = await listModels({ provider: preset.id, baseUrl, apiKey });
    if (!models) {
      return NextResponse.json({
        models: [],
        supported: false,
        message:
          `${preset.label} no expone el listado de modelos en esa URL. Escribe el modelo a mano; ` +
          `sugeridos: ${preset.models.slice(0, 4).join(", ") || "consulta la documentación"}.`,
      });
    }
    return NextResponse.json({ models, supported: true, message: `${models.length} modelos disponibles.` });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "No se pudo listar." }, { status: 502 });
  }
}
