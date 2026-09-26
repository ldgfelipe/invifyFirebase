// ============================================================================
// API /api/ai/edit-template
// Modifica el builderConfig que el cliente está editando según su mensaje.
// Requiere que el usuario sea dueño de la invitación.
//
// El prompt incluye la config actual, el catálogo de fondos por tema y el
// banco de imágenes locales, para que la IA trabaje con material real de
// Invify y no invente rutas o colores.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getAiSettings } from "@/lib/ai/config";
import { chatCompletion, extractJson, isProviderReady } from "@/lib/ai/client";
import { ATMOSPHERE_OPTIONS, IMAGE_STYLE_OPTIONS } from "@/lib/ai/options";
import type { BuilderConfig } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BUILDER_CONFIG_BYTES = 200_000; // ~200 KB de prompt

/** Valida que el body tenga lo mínimo y que el usuario sea dueño de la invitación. */
async function requireValidRequest(req: NextRequest) {
  const raw = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!raw) return { error: "No autorizado" as const, status: 401 };

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(raw)).uid;
  } catch {
    return { error: "No autorizado" as const, status: 401 };
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return { error: "Body inválido" as const, status: 400 };
  }

  const { invitationId, builderConfig, message, language } = body ?? {};
  if (!invitationId || !builderConfig || !message) {
    return { error: "Falta invitationId, builderConfig o message", status: 400 };
  }

  try {
    const snap = await adminDb.collection("invitations").doc(invitationId).get();
    if (!snap.exists || (snap.data()?.ownerUid as string) !== uid) {
      return { error: "No tienes permiso sobre esta invitación", status: 403 };
    }
  } catch {
    return { error: "Error al verificar la invitación", status: 500 };
  }

  const cfg = JSON.stringify(builderConfig);
  if (Buffer.byteLength(cfg, "utf8") > MAX_BUILDER_CONFIG_BYTES) {
    return { error: "La configuración es demasiado grande.", status: 413 };
  }

  return { uid, invitationId, builderConfig, message, language };
}

/** Lista de fondos y estilos que la IA puede usar, organizada por tema. */
function materialsBlock(category: string) {
  const atmospheres = ATMOSPHERE_OPTIONS.map((a) => {
    const p = a.palette;
    return `  - ${a.id}: fondo ${p.background}, texto ${p.textColor}, primario ${p.primary}, fuente ${p.fontFamily}`;
  }).join("\n");

  const styles = IMAGE_STYLE_OPTIONS.map((s) => `  - ${s.id}`).join("\n");

  const thumbSeeds = Array.from({ length: 90 }, (_, i) => i + 1)
    .map((n) => `/api/thumb/lock/${n}`)
    .join(", ");

  return `## Material disponible de Invify (solo usa estos recursos)

### Fondos por tema (paletas que puedes aplicar al cambiar el fondo global)
${atmospheres}

### Estilos de imágenes para el carrusel y cabecera
${styles}

### Banco de imágenes locales (usa estas rutas tal cual; están en tu propio dominio)
${thumbSeeds}

No inventes rutas de imágenes ni colores que no estén en esta lista.
`;
}

export async function POST(req: NextRequest) {
  const valid = await requireValidRequest(req);
  if ("status" in valid && typeof valid.status === "number") {
    return NextResponse.json({ error: valid.error }, { status: valid.status });
  }

  const { uid, builderConfig, message, language } = valid as {
    uid: string;
    builderConfig: BuilderConfig;
    message: string;
    language: string;
  };

  // Si la IA está apagada o no tiene credencial, usa el mock determinista
  // para que el editor siga funcionando y dando contexto.
  const settings = await getAiSettings();
  if (!isProviderReady(settings)) {
    return NextResponse.json(
      { builderConfig, warning: "La IA está apagada. Los cambios se aplican manualmente desde el editor." },
      { status: 200 }
    );
  }

  const systemPrompt = [
    "Eres el asistente de diseño de invitaciones de Invify. Tu ÚNICO trabajo es modificar el JSON de configuración que te doy según lo que pida el usuario.",
    "",
    "Reglas estrictas:",
    "- Responde ÚNICAMENTE con el JSON de BuilderConfig modificado. Sin texto fuera del JSON, sin markdown, sin comentarios, sin explicación.",
    "- Estructura exacta: { \"modules\": [...], \"theme\": { \"primaryColor\", \"background\", \"textColor\", \"fontFamily\", \"backgroundImage?\", \"backgroundOverlay?\" } }.",
    "- Los módulos tienen id (string), type (string), visible (boolean), y campos según su tipo.",
    "- Conserva IDENTICAL todo lo que no se pida modificar. Cambia solo lo pedido.",
    "- Para imágenes, usa rutas locales con el formato /api/thumb/lock/N (N un entero 1-90) salvo que el usuario pida explícitamente otro recurso.",
    "- Para colores, usa hexadecimal (#RGB o #RRGGBB).",
    "- No añadas ni quites módulos salvo que el usuario lo pida de forma explícita.",
    "- Responde siempre en el idioma del usuario para los textos dentro de los módulos (títulos, contenido).",
    "",
    materialsBlock(language === "en" ? "corporativo" : "boda"),
  ].join("\n");

  const userMessage = [
    `=== CONFIGURACIÓN ACTUAL DE LA INVITACIÓN (responde con esta misma estructura, aplicando los cambios) ===`,
    JSON.stringify(builderConfig, null, 0),
    ``,
    `=== PETICIÓN DEL USUARIO ===`,
    message,
  ].join("\n");

  try {
    const result = await chatCompletion(
      settings,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { timeoutMs: 120_000 }
    );

    if (!result) {
      return NextResponse.json(
        { error: "La IA no respondió. Intenta de nuevo." },
        { status: 503 }
      );
    }

    const json = extractJson(result.raw);
    if (!json || !json.modules || !json.theme) {
      return NextResponse.json(
        {
          error: `La IA devolvió algo que no es un BuilderConfig válido. ${result.raw.slice(0, 200)}`,
          raw: result.raw.slice(0, 500),
        },
        { status: 422 }
      );
    }

    // Asegura que solo sobrevengan las propiedades esperadas de BuilderConfig
    const safe: BuilderConfig = {
      modules: Array.isArray(json.modules) ? json.modules : builderConfig.modules,
      theme: json.theme && typeof json.theme === "object" ? json.theme : builderConfig.theme,
    };

    return NextResponse.json({ builderConfig: safe });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error al llamar a la IA" },
      { status: 502 }
    );
  }
}
