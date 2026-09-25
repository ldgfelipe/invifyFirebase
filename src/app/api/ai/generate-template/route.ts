// ============================================================================
// API /api/ai/generate-template
// Recibe las respuestas del wizard + idioma activo, carga la configuración del
// asistente desde /aiConfig/global (ver src/lib/ai/config.ts), arma el prompt
// con las reglas que definió el admin y genera el builderConfig (IA real si está
// habilitada, si no el mock determinista). Guarda el resultado en /demoTemplates
// marcado como 'demo' y por categoría. Devuelve el id para seguimiento.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { callAi, getAiSettings } from "@/lib/ai/config";
import {
  buildAIPrompt,
  buildMockTemplate,
  type Lang,
} from "@/lib/ai/templatePrompt";
import {
  ATMOSPHERE_OPTIONS,
  CATEGORY_OPTIONS,
  FEATURE_OPTIONS,
  IMAGE_STYLE_OPTIONS,
  DEFAULT_ANSWERS,
  type WizardAnswers,
} from "@/lib/ai/options";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const settings = await getAiSettings();

  let uid: string | null = null;
  const idToken = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (idToken) {
    try {
      uid = (await adminAuth.verifyIdToken(idToken)).uid;
    } catch {
      // La sesión es opcional: se puede generar sin autenticación.
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // "auto" = el idioma que eligió el usuario; "es"/"en" = forzados por el admin.
  const requested: Lang = body.language === "en" ? "en" : "es";
  const language: Lang = settings.languageMode === "auto" ? requested : settings.languageMode;

  const valid = (list: { id: string }[], id: string | undefined, fallback: string) =>
    list.some((o) => o.id === id) ? id! : fallback;

  const answers: WizardAnswers = {
    category: valid(CATEGORY_OPTIONS, body.category, DEFAULT_ANSWERS.category),
    names: typeof body.names === "string" ? body.names.slice(0, 120) : "",
    date: typeof body.date === "string" ? body.date.slice(0, 10) : "",
    atmosphere: valid(ATMOSPHERE_OPTIONS, body.atmosphere, DEFAULT_ANSWERS.atmosphere),
    features: Array.isArray(body.features)
      ? body.features.filter((f: unknown) => FEATURE_OPTIONS.some((o) => o.id === f))
      : DEFAULT_ANSWERS.features,
    imageStyle: valid(IMAGE_STYLE_OPTIONS, body.imageStyle, DEFAULT_ANSWERS.imageStyle),
  };

  if (!answers.names.trim()) {
    answers.names =
      language === "en" ? settings.defaultNamesEn : settings.defaultNames;
  }

  const prompt = buildAIPrompt({
    language,
    answers,
    customInstructions: settings.customInstructions,
  });

  // Intenta IA real; si está apagada, no hay clave o falla, usa el mock.
  let aiResult: any | null = null;
  let aiError: string | null = null;
  if (settings.enabled && settings.apiKey) {
    try {
      const response = await callAi(settings, [
        ...(settings.systemPrompt?.trim()
          ? [{ role: "system" as const, content: settings.systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ]);
      aiResult = response?.json ?? null;
    } catch (err: any) {
      aiError = err?.message ?? "Error desconocido";
      if (!settings.fallbackToMock) {
        return NextResponse.json({ error: `Error de la IA: ${aiError}` }, { status: 502 });
      }
    }
  }

  const mock = buildMockTemplate({ language, answers, imageSource: settings.imageSource });
  const builderConfig = aiResult?.builderConfig ?? mock.builderConfig;
  const template = {
    id: mock.id,
    name: typeof aiResult?.name === "string" && aiResult.name.trim() ? aiResult.name : mock.name,
    category: mock.category,
    thumbnailUrl:
      typeof aiResult?.thumbnailUrl === "string" && aiResult.thumbnailUrl.trim()
        ? aiResult.thumbnailUrl
        : mock.thumbnailUrl,
    previewUrl:
      typeof aiResult?.previewUrl === "string" && aiResult.previewUrl.trim()
        ? aiResult.previewUrl
        : mock.previewUrl,
  };

  const docData = {
    uid: uid ?? null,
    language,
    isDemo: true,
    status: "demo" as const,
    category: template.category,
    name: template.name,
    // Respuestas completas del usuario (auditoría / re-generación futura).
    answers,
    aiPrompt: prompt,
    builderConfig,
    thumbnailUrl: template.thumbnailUrl,
    previewUrl: template.previewUrl,
    generatedByAI: Boolean(aiResult?.builderConfig),
    aiModel: aiResult?.builderConfig ? settings.model : null,
    aiError: aiError ?? null,
    createdAt: Date.now(),
  };

  try {
    await adminDb.collection("demoTemplates").doc(template.id).set(docData);
    return NextResponse.json({
      id: template.id,
      name: template.name,
      category: template.category,
      demo: true,
      generatedByAI: docData.generatedByAI,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}