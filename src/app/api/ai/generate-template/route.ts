// ============================================================================
// API /api/ai/generate-template
// Recibe las respuestas del wizard + idioma activo, arma el prompt principal
// para la IA, genera el builderConfig (IA real si hay clave configurada, si no
// usa el mock determinista) y guarda el resultado en /demoTemplates marcado
// como 'demo' y por categoría. Devuelve el id para seguimiento.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
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

function excerptJson(content: string): any | null {
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

async function generateWithAI(prompt: string): Promise<any | null> {
  const key = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return excerptJson(content);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
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

  const language: Lang = body.language === "en" ? "en" : "es";

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

  const prompt = buildAIPrompt({ language, answers });

  // Intenta IA real; si no hay clave o falla, usa el mock determinista.
  const aiResult = await generateWithAI(prompt);
  const mock = buildMockTemplate({ language, answers });
  const builderConfig = aiResult?.builderConfig ?? mock.builderConfig;
  const template = {
    id: mock.id,
    name: mock.name,
    category: mock.category,
    thumbnailUrl: mock.thumbnailUrl,
    previewUrl: mock.previewUrl,
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
    generatedByAI: Boolean(aiResult),
    createdAt: Date.now(),
  };

  try {
    await adminDb.collection("demoTemplates").doc(template.id).set(docData);
    return NextResponse.json({
      id: template.id,
      name: template.name,
      category: template.category,
      demo: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}