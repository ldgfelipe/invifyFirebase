// ============================================================================
// API /api/thumb/[templateId]
// Miniatura SVG por plantilla (1200x630) construida con el diseño REAL de su
// builderConfig: fondo, color primario, tipografía y el texto real del módulo
// header (título, subtítulo, nombres y fecha).
//
// Por qué no se usa una foto: las plantillas se sembraron con URLs de
// loremflickr, que hoy responde 401 ante hotlink, así que no hay ninguna foto
// real guardada que mostrar. Cuando el admin suba una foto por plantilla, esta
// ruta deja de usarse (ver resolveTemplateThumb).
//
// NOTA: dentro de un atributo SVG el color va en hexadecimal CRUDO. Codificarlo
// como %23 (URL) lo vuelve inválido y el navegador dibuja la figura invisible.
// Por eso los colores se interpolan tal cual, sin escapear.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const W = 1200;
const H = 630;

function normalizeThemeColor(c: string | undefined): string | null {
  if (!c) return null;
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return null;
  return c.length === 4
    ? "#" + Array.from(c.slice(1)).map((x) => x + x).join("")
    : c;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mix(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ch = (i: number) =>
    Math.round(
      parseInt(pa.slice(i * 2, i * 2 + 2), 16) * (1 - t) +
        parseInt(pb.slice(i * 2, i * 2 + 2), 16) * t
    )
      .toString(16)
      .padStart(2, "0");
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-08-12T17:00:00" -> "12 de agosto de 2026" */
function formatEsDate(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/**
 * Parte un texto en como mucho `maxLines` lineas que quepan en `maxWidth`.
 * Estimacion conservadora: Georgia ~0.56em por caracter, sans ~0.54em.
 */
function wrapText(
  text: string,
  fontSize: number,
  maxWidth: number,
  maxLines: number,
  perChar: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const fits = (line: string) => line.length * fontSize * perChar <= maxWidth;

  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const attempt = current ? `${current} ${w}` : w;
    if (fits(attempt) || !current) {
      current = attempt;
    } else {
      lines.push(current);
      current = w;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length === maxLines) {
    // Si hubo que recortar, marca el final con puntos suspensivos.
    const last = lines[maxLines - 1];
    const joined = words.join(" ");
    const kept = lines.join(" ");
    if (kept.length < joined.length) {
      let cut = last;
      while (cut.length > 1 && !fits(`${cut}...`)) cut = cut.slice(0, -1);
      lines[maxLines - 1] = `${cut}...`;
    }
  }
  return lines;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { templateId: string } }
): Promise<NextResponse> {
  const { templateId } = params;

  let bg = "#FFFBF2";
  let primary = "#C9A227";
  let serif = false;
  let title = "Invitación digital";
  let subtitle = "";
  let names = "";
  let dateText = "";
  let category = "";

  try {
    let snap = await adminDb.collection("templates").doc(templateId).get();
    if (!snap.exists) {
      const demo = await adminDb.collection("demoTemplates").doc(templateId).get();
      if (demo.exists) snap = demo;
    }
    if (snap.exists) {
      const data = snap.data() as any;
      const theme = data?.builderConfig?.theme ?? {};
      bg = normalizeThemeColor(theme?.background ?? theme?.backgroundColor) ?? bg;
      primary = normalizeThemeColor(theme?.primaryColor) ?? primary;
      serif = theme?.fontFamily !== "sans";
      if (typeof data?.name === "string" && data.name.trim()) title = data.name.trim();
      if (typeof data?.category === "string") category = data.category;

      const header = (data?.builderConfig?.modules ?? []).find((m: any) => m?.type === "header");
      if (header) {
        if (typeof header.title === "string" && header.title.trim()) title = header.title.trim();
        if (typeof header.subtitle === "string") subtitle = header.subtitle.trim();
        if (typeof header.names === "string") names = header.names.trim();
        dateText = formatEsDate(header.date);
      }
    }
  } catch {
    // Si falla la lectura se usa la paleta por defecto: nunca rompe el catalogo.
  }

  const isDark = luminance(bg) < 0.45;
  const ink = isDark ? mix(bg, "#ffffff", 0.95) : "#1F2937";
  const soft = isDark ? mix(bg, "#ffffff", 0.72) : mix(primary, "#1F2937", 0.35);
  const font = serif
    ? "Georgia, 'Times New Roman', serif"
    : "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  // ---- layout: tarjeta de invitación centrada sobre el fondo del tema ----
  const cardX = 96;
  const cardY = 70;
  const cardW = 560;
  const cardH = 490;
  const cardFill = isDark ? mix(bg, "#ffffff", 0.08) : "#ffffff";
  const cardStroke = isDark ? mix(bg, "#ffffff", 0.3) : mix(primary, "#ffffff", 0.55);

  // ---- textos ----
  const cx = cardX + cardW / 2;
  const maxW = cardW - 88;

  const nameSize = title.length > 26 ? 34 : title.length > 16 ? 42 : 52;
  const titleLines = wrapText(title, nameSize, maxW, 2, serif ? 0.56 : 0.54);
  const titleY0 = 232;

  const subLines = subtitle ? wrapText(subtitle, 20, maxW, 2, 0.5) : [];
  const subY0 = titleY0 + titleLines.length * (nameSize + 6) + 18;

  const footParts = [names, dateText].filter(Boolean);
  const footLines = footParts.length
    ? wrapText(footParts.join("  ·  "), 19, maxW, 2, 0.52)
    : [];

  const text = (x: number, y: number, size: number, fill: string, s: string, weight = "", spacing = 0) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" fill="${fill}"${weight ? ` font-weight="${weight}"` : ""}${spacing ? ` letter-spacing="${spacing}"` : ""}>${escapeXml(s)}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(title)}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <g opacity=".55">
    <circle cx="1060" cy="90" r="230" fill="${primary}" opacity=".10"/>
    <circle cx="1120" cy="600" r="180" fill="${primary}" opacity=".08"/>
    <circle cx="90" cy="590" r="140" fill="${primary}" opacity=".07"/>
  </g>

  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="18" fill="${cardFill}" stroke="${cardStroke}" stroke-width="2"/>
  <rect x="${cardX + 18}" y="${cardY + 18}" width="${cardW - 36}" height="${cardH - 36}" rx="12" fill="none" stroke="${cardStroke}" stroke-width="1" opacity=".7"/>

  <g>
    <path d="M${cx - 17} 150c0-11 8-19 17-19s17 8 17 19c0 13-17 27-17 27s-17-14-17-27z" fill="${primary}" opacity=".9"/>
    <circle cx="${cx}" cy="150" r="46" fill="none" stroke="${primary}" stroke-width="1.5" opacity=".45"/>
  </g>

  <rect x="${cx - 46}" y="${titleY0 - 62}" width="92" height="2" fill="${primary}" opacity=".55"/>

  ${titleLines.map((l, i) => text(cx, titleY0 + i * (nameSize + 6), nameSize, ink, l, "600")).join("\n  ")}
  ${subLines.map((l, i) => text(cx, subY0 + i * 26, 20, soft, l)).join("\n  ")}

  <rect x="${cx - 52}" y="${cardY + cardH - 104}" width="104" height="1" fill="${primary}" opacity=".5"/>
  ${footLines.map((l, i) => text(cx, cardY + cardH - 74 + i * 26, 19, soft, l)).join("\n  ")}

  ${text(W - 48, H - 46, 22, primary, "invify", "700", 3)}
  ${category ? text(48, H - 46, 15, soft, category.toUpperCase(), "", 3) : ""}
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // TTL corto a proposito: el SVG depende del codigo y de los datos de la
      // plantilla, y un s-maxage largo dejaba congelada una version defectuosa.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}