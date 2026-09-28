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
import { callAi } from "@/lib/ai/config";
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

/** Lista de fondos y estilos que la IA puede usar. */
function materialsBlock() {
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

type ReplyLang = "es" | "en";

/** Normaliza un mensaje para detectar charla casual. */
function plain(msg: string): string {
  return msg
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¡!¿?.,;:\-—_()"'«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Responde charla casual (saludos, gracias, "qué puedes hacer") SIN llamar a
 * la IA: ahorra tokens y se siente humano. null = es una petición de edición.
 */
function smallTalkReply(message: string, lang: ReplyLang): string | null {
  const t = plain(message);
  if (!t) return null;
  const en = lang === "en";

  if (/^(hola+|buenas(\s+(tardes|noches|dias))?|hey+|hi+|hello+|que tal|saludos)\s*$/.test(t)) {
    return en
      ? "Hi! Lovely to see you. Tell me what you'd like to change — names, date, colors, photos, sections — and I'll update it right away."
      : "¡Hola! Qué gusto saludarte. Dime qué quieres cambiar —nombres, fecha, colores, fotos, secciones— y lo actualizo al momento.";
  }
  if (/^(gracias|muchas gracias|thanks|thank you|te agradezco)\s*$/.test(t)) {
    return en
      ? "You're so welcome! I'm here whenever you need another tweak."
      : "¡Con gusto! Aquí estoy para cualquier otro ajuste que necesites.";
  }
  if (
    t.length < 80 &&
    /(que puedes hacer|qué puedes hacer|que sabes hacer|como funcionas|cómo funcionas|ayuda|help|what can you do|who are you|quien eres|quién eres|como te llamas|cómo te llamas)/.test(t)
  ) {
    return en
      ? "I'm your design assistant: I can update names and dates, change colors and backgrounds, swap photos, and show or hide sections — just tell me in your own words."
      : "Soy tu asistente de diseño: puedo cambiar nombres y fechas, colores y fondos, fotos, y mostrar u ocultar secciones — dímelo con tus palabras.";
  }
  return null;
}

const MODULE_LABEL: Record<string, { es: string; en: string }> = {
  preloader: { es: "la portada de entrada", en: "the entry cover" },
  header: { es: "el encabezado", en: "the header" },
  countdown: { es: "la cuenta regresiva", en: "the countdown" },
  audio: { es: "la música", en: "the music" },
  carousel: { es: "la galería de fotos", en: "the photo gallery" },
  location: { es: "la ubicación", en: "the venue section" },
  dresscode: { es: "el código de vestimenta", en: "the dress code" },
  itinerary: { es: "el itinerario", en: "the itinerary" },
  giftTable: { es: "la mesa de regalos", en: "the gift table" },
  quiz: { es: "las preguntas", en: "the quiz" },
  rsvp: { es: "la confirmación de asistencia", en: "the RSVP" },
  text: { es: "un texto", en: "a text block" },
};

const modLabel = (type: string, en: boolean) =>
  MODULE_LABEL[type]?.[en ? "en" : "es"] ?? (en ? "a section" : "una sección");

const short = (s: unknown, n = 60): string => {
  const t = String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).trimEnd() + "…" : t;
};

/** "2026-10-08" → "8 de octubre de 2026" / "October 8, 2026". */
function fmtDate(iso: unknown, en: boolean): string {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso ?? "");
  const monthsEs = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const monthsEn = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const d = Number(m[3]);
  const mi = Number(m[2]) - 1;
  return en ? `${monthsEn[mi]} ${d}, ${m[1]}` : `${d} de ${monthsEs[mi]} de ${m[1]}`;
}

const byId = (mods: any[], id: string) => (Array.isArray(mods) ? mods.find((x) => x?.id === id) : undefined);
const byType = (mods: any[], type: string) =>
  Array.isArray(mods) ? mods.find((x) => x?.type === type) : undefined;

/**
 * Describe en lenguaje humano y cálido qué cambió entre dos configuraciones.
 * Nunca incluye JSON ni tecnicismos: es lo que ve el usuario en el chat.
 */
function summarizeChanges(before: BuilderConfig, after: BuilderConfig, lang: ReplyLang): string {
  const en = lang === "en";
  const b = (before?.modules ?? []) as any[];
  const a = (after?.modules ?? []) as any[];
  const bt = (before?.theme ?? {}) as any;
  const at = (after?.theme ?? {}) as any;
  const changes: string[] = [];

  // Tema global
  if (at.background && at.background !== bt.background)
    changes.push(en ? "the background color" : "el color de fondo");
  if (at.primaryColor && at.primaryColor !== bt.primaryColor)
    changes.push(en ? "the main color" : "el color principal");
  if (at.textColor && at.textColor !== bt.textColor)
    changes.push(en ? "the text color" : "el color del texto");
  if (at.fontFamily && at.fontFamily !== bt.fontFamily)
    changes.push(en ? "the typography" : "la tipografía");
  if (at.backgroundImage && at.backgroundImage !== bt.backgroundImage)
    changes.push(en ? "the background image" : "la imagen de fondo");

  // Encabezado: nombres y fecha
  const bh = byType(b, "header") ?? {};
  const ah = byType(a, "header") ?? {};
  if (ah.names && ah.names !== bh.names && short(ah.names))
    changes.push(
      en ? `the names to "${short(ah.names)}"` : `los nombres a "${short(ah.names)}"`
    );
  if (ah.date && ah.date !== bh.date)
    changes.push(
      en ? `the date to ${fmtDate(ah.date, true)}` : `la fecha al ${fmtDate(ah.date, false)}`
    );
  if (ah.imageUrl && ah.imageUrl !== bh.imageUrl)
    changes.push(en ? "the header photo" : "la foto del encabezado");

  // Cuenta regresiva
  const bc = byType(b, "countdown") ?? {};
  const ac = byType(a, "countdown") ?? {};
  if (ac.targetDate && ac.targetDate !== bc.targetDate)
    changes.push(
      en ? `the countdown to ${fmtDate(ac.targetDate, true)}` : `la cuenta regresiva al ${fmtDate(ac.targetDate, false)}`
    );
  else if (ac.label && ac.label !== bc.label && short(ac.label))
    changes.push(
      en ? `the countdown text to "${short(ac.label)}"` : `el texto de la cuenta regresiva a "${short(ac.label)}"`
    );

  // Ubicación
  const bl = byType(b, "location") ?? {};
  const al = byType(a, "location") ?? {};
  if (al.venue && al.venue !== bl.venue && short(al.venue))
    changes.push(en ? `the venue to "${short(al.venue)}"` : `el lugar a "${short(al.venue)}"`);
  else if (al.address && al.address !== bl.address && short(al.address))
    changes.push(en ? "the address" : "la dirección");

  // Galería
  const bcar = byType(b, "carousel") ?? {};
  const acar = byType(a, "carousel") ?? {};
  if (Array.isArray(acar.images) && (!Array.isArray(bcar.images) || acar.images.length !== bcar.images.length))
    changes.push(en ? "the gallery photos" : "las fotos de la galería");

  // Código de vestimenta / textos generales
  const bd = byType(b, "dresscode") ?? {};
  const ad = byType(a, "dresscode") ?? {};
  if (ad.code && ad.code !== bd.code && short(ad.code))
    changes.push(en ? `the dress code to "${short(ad.code)}"` : `el código de vestimenta a "${short(ad.code)}"`);
  const btx = byType(b, "text") ?? {};
  const atx = byType(a, "text") ?? {};
  if ((atx.text ?? atx.content) && (atx.text ?? atx.content) !== (btx.text ?? btx.content))
    changes.push(en ? "a text" : "un texto");
  const br = byType(b, "rsvp") ?? {};
  const ar = byType(a, "rsvp") ?? {};
  if (ar.title && ar.title !== br.title && short(ar.title))
    changes.push(en ? `the RSVP title to "${short(ar.title)}"` : `el título de confirmación a "${short(ar.title)}"`);

  // Módulos agregados / quitados / visibilidad
  const bIds = new Set(b.map((m) => m?.id));
  const aIds = new Set(a.map((m) => m?.id));
  for (const m of a) {
    if (m?.id && !bIds.has(m.id)) {
      changes.push(en ? `added ${modLabel(m.type, true)}` : `agregué ${modLabel(m.type, false)}`);
      break;
    }
  }
  for (const m of b) {
    if (m?.id && !aIds.has(m.id)) {
      changes.push(en ? `removed ${modLabel(m.type, true)}` : `quité ${modLabel(m.type, false)}`);
      break;
    }
  }
  for (const m of a) {
    const o = m?.id ? byId(b, m.id) : undefined;
    if (o && o.visible !== m.visible) {
      changes.push(
        m.visible
          ? en ? `showed ${modLabel(m.type, true)}` : `mostré ${modLabel(m.type, false)}`
          : en ? `hid ${modLabel(m.type, true)}` : `oculté ${modLabel(m.type, false)}`
      );
      break;
    }
  }

  const uniq = [...new Set(changes)].slice(0, 3);
  if (uniq.length === 0) {
    return en
      ? "Done! I applied what you asked me to. Take a look at the preview."
      : "¡Listo! Apliqué lo que me pediste. Échale un ojo a la vista previa.";
  }
  const opener = en ? "Done!" : "¡Listo!";
  const verb = en ? "I updated " : "Actualicé ";
  const closer = en ? " Take a look at the preview." : " Échale un ojo a la vista previa.";
  return `${opener} ${verb}${uniq.join(", ")}.${closer}`;
}

export async function POST(req: NextRequest) {  const valid = await requireValidRequest(req);
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
  const lang: ReplyLang = language === "en" ? "en" : "es";
  if (!settings.enabled) {
    return NextResponse.json(
      { builderConfig, warning: "La IA está apagada. Los cambios se aplican manualmente desde el editor." },
      { status: 200 }
    );
  }

  // Charla casual: respuesta humana inmediata, sin gastar tokens ni tocar nada.
  const smallTalk = smallTalkReply(message, lang);
  if (smallTalk) {
    return NextResponse.json({ builderConfig, reply: smallTalk });
  }

  const SCHEMA = `## JSON Schema de BuilderConfig (responde SIEMPRE con esta estructura)

\`\`\`json
{
  "modules": [
    {
      "id": "string (único, no lo cambies salvo que se indique)",
      "type": "preloader|header|countdown|audio|carousel|location|dresscode|itinerary|giftTable|quiz|rsvp|text",
      "visible": true,
      "style": { "background"?, "textColor"?, "backgroundImage"?, "backgroundOverlay"?, "padding"?, "borderRadius"?, "border"?, "textAlign"? },
      "title": "string",
      "subtitle": "string",
      "names": "string",
      "date": "YYYY-MM-DD",
      "imageUrl": "string (usa /api/thumb/lock/N)",
      "text": "string (HTML admitido)",
      "content": "string (HTML)",
      "align": "left|center|right|justify",
      "targetDate": "ISO date",
      "label": "string",
      "venue": "string",
      "address": "string",
      "lat": number,
      "lng": number,
      "mapUrl": "string",
      "code": "string",
      "description": "string",
      "items": [ { "time": "string", "title": "string", "description"?, "name"?, "url"?, "imageUrl"? } ],
      "src": "string (URL de audio MP3/OGG)",
      "autoplay": boolean,
      "images": [ { "url": "string", "caption"?: string } ],
      "questions": [ { "id": "string", "question": "string", "options": [string] } ],
      "title": "string",
      "collectEmail": boolean
    }
  ],
  "theme": {
    "primaryColor": "#hex",
    "background": "#hex",
    "textColor": "#hex",
    "fontFamily": "serif|sans",
    "backgroundImage"?: "url",
    "backgroundOverlay"?: "rgba(r,g,b,a)"
  }
}
\`\`\`
Reglas: responde ÚNICAMES con ese JSON, sin markdown ni texto extra. Modifica SOBRE el objeto que te doy; conserva todo lo que no se pida.`;

const systemPrompt = [
  "Eres el asistente de diseño de invitaciones de Invify. Tu ÚNICO trabajo es modificar el JSON de configuración que te doy según lo que pida el usuario.",
  "",
  SCHEMA,
  "",
  "Material disponible (usa SOLO estas rutas para imágenes y estos fondos):",
    materialsBlock(),
  ].join("\n");

  const userMessage = [
    `=== CONFIGURACIÓN ACTUAL DE LA INVITACIÓN (responde con esta misma estructura, aplicando los cambios) ===`,
    JSON.stringify(builderConfig, null, 0),
    ``,
    `=== PETICIÓN DEL USUARIO ===`,
    message,
  ].join("\n");

  try {
    const result = await callAi(
      settings,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { timeoutMs: 120_000 }
    );

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Ningún proveedor de IA respondió. Revisa en Admin → Asistente IA que haya al menos un proveedor activo, con su API key guardada y la conexión probada (botón Probar).",
        },
        { status: 503 }
      );
    }

    const json = result.json;
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

    // Respuesta humana (el JSON nunca se muestra en el chat).
    const reply = summarizeChanges(builderConfig, safe, lang);
    return NextResponse.json({ builderConfig: safe, reply });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error al llamar a la IA" },
      { status: 502 }
    );
  }
}
