// ============================================================================
// API /api/thumb/[templateId]
// Genera un thumbnail SVG determinista (800x600) con los colores reales del
// builderConfig.theme de cada plantilla + un motivo por categoría. No depende
// de servicios externos (loremflickr cae con 401 ante hotlink), así el catálogo
// local siempre muestra imagen. Aditivo: no rompe catálogo ni pricing existente.
//
// NOTA: dentro de un atributo SVG el color va en hexadecimal CRUDO. Codificarlo
// como %23 (URL) lo vuelve inválido y el navegador dibuja la figura invisible.
// Por eso los colores se interpolan tal cual, sin escapear.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const CATEGORY_MOTIFS: Record<string, { label: string; shape: string }> = {
  boda: {
    label: "Boda",
    shape:
      '<circle cx="400" cy="280" r="104" fill="none" stroke="%ACCENT%" stroke-width="3" opacity=".9"/><circle cx="400" cy="280" r="78" fill="none" stroke="%ACCENT%" stroke-width="1.5" opacity=".65"/><path d="M400 222l13 22 10-10 10 10 13-22-23 24z" fill="%ACCENT%" opacity=".55"/>',
  },
  cumpleanos: {
    label: "Cumpleaños",
    shape:
      '<path d="M330 330q10-56 70-56t70 56z" fill="%ACCENT%" opacity=".38"/><path d="M352 296l-8-17 17-8-17-8 8-17 17 8v-18l8 17 17-8-8 17 17 8-17 8 8 17-17-8v17l-8-17-17 8z" fill="%ACCENT%"/>',
  },
  babyshower: {
    label: "Baby Shower",
    shape:
      '<path d="M336 282a64 72 0 0 1 128 0z" fill="none" stroke="%ACCENT%" stroke-width="3"/><path d="M400 284v78" stroke="%ACCENT%" stroke-width="2" opacity=".8"/><circle cx="400" cy="312" r="13" fill="none" stroke="%ACCENT%" stroke-width="2"/>',
  },
  bautizo: {
    label: "Bautizo",
    shape:
      '<path d="M400 214v124m0-74l36 40-36-40-36 40" fill="none" stroke="%ACCENT%" stroke-width="3"/><path d="M406 392h-16" stroke="%ACCENT%" stroke-width="3"/>',
  },
  corporativo: {
    label: "Corporativo",
    shape:
      '<rect x="316" y="222" width="168" height="116" rx="6" fill="none" stroke="%ACCENT%" stroke-width="3"/><path d="M316 258h168" stroke="%ACCENT%" stroke-width="1.5" opacity=".7"/><path d="M338 300h60" stroke="%ACCENT%" stroke-width="4"/><circle cx="452" cy="300" r="12" fill="%ACCENT%" opacity=".45"/>',
  },
};

const FALLBACK_ACCENTS = ["#C9A227", "#2F5D8A", "#4C9A8A", "#E4572E", "#8B5E3C"];

function normalizeThemeColor(c: string | undefined): string | null {
  if (!c) return null;
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return null;
  return c.length === 4
    ? "#" + Array.from(c.slice(1)).map((x) => x + x).join("")
    : c;
}

function defaultAccentFor(templateId: string): string {
  let h = 0;
  for (const ch of templateId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_ACCENTS[h % FALLBACK_ACCENTS.length];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Luminancia relativa 0..1 para decidir texto claro u oscuro. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mezcla dos colores hex. t=0 -> a, t=1 -> b. */
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

/** Reduce el cuerpo para que un nombre largo no se salga de la tarjeta. */
function fitFontSize(name: string, base: number, maxWidth: number): number {
  let size = base;
  // Aproximación: Georgia/serif ronda 0.52 em por carácter.
  while (size > 14 && name.length * size * 0.52 > maxWidth) size -= 2;
  return size;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { templateId: string } }
): Promise<NextResponse> {
  const { templateId } = params;

  let primary: string | null = null;
  let background: string | null = null;
  let name = "Invitación";
  let category: string | null = null;

  try {
    // Una sola lectura: el mismo doc alimentaba antes dos consultas.
    let snap = await adminDb.collection("templates").doc(templateId).get();
    if (!snap.exists) {
      const demo = await adminDb.collection("demoTemplates").doc(templateId).get();
      if (demo.exists) snap = demo;
    }
    if (snap.exists) {
      const data = snap.data() as any;
      const theme = data?.builderConfig?.theme ?? {};
      primary = normalizeThemeColor(theme?.primaryColor);
      background = normalizeThemeColor(theme?.background ?? theme?.backgroundColor);
      name = (data?.name as string) ?? "Invitación";
      category = typeof data?.category === "string" ? data.category : null;
    }
  } catch {
    // si falla la lectura, usa la paleta por defecto: nunca rompe el catálogo.
  }

  // Normaliza la categoría para acertar con la clave del diccionario.
  const catKey = (category ?? name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

  const motif =
    CATEGORY_MOTIFS[catKey] ??
    CATEGORY_MOTIFS[Object.keys(CATEGORY_MOTIFS).find((k) => catKey.includes(k)) ?? ""] ??
    null;

  const accent = defaultAccentFor(templateId);
  // El acento es un color propio, siempre válido: se interpola en crudo.
  const shape = (motif?.shape ?? "").replaceAll("%ACCENT%", accent);

  // Tema: si el fondo es oscuro, la tarjeta y el texto se invierten para
  // mantener el contraste; si es claro, tarjeta blanca y texto del tema.
  const isDark = background ? luminance(background) < 0.45 : false;
  const bg = background ?? "#FFFBF2";
  const card = isDark ? mix(bg, "#ffffff", 0.1) : "#ffffff";
  const ink = isDark ? mix(bg, "#ffffff", 0.92) : primary ?? "#1F2937";
  const cardBorder = isDark ? mix(bg, "#ffffff", 0.28) : accent;

  const nameSize = fitFontSize(name, 30, 264);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img">
  <rect width="800" height="600" fill="${bg}"/>
  <g opacity=".9">
    <circle cx="60" cy="70" r="120" fill="${accent}" opacity=".07"/>
    <circle cx="752" cy="540" r="150" fill="${accent}" opacity=".06"/>
    <circle cx="740" cy="60" r="70" fill="${accent}" opacity=".05"/>
  </g>
  <rect x="248" y="68" width="312" height="432" rx="10" fill="${accent}" opacity=".16"/>
  <rect x="240" y="60" width="312" height="432" rx="10" fill="${card}" stroke="${cardBorder}" stroke-width="1.5"/>
  <g transform="translate(0,-14)">${shape}</g>
  <rect x="300" y="352" width="192" height="1" fill="${cardBorder}" opacity=".35"/>
  <text x="396" y="398" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${nameSize}" fill="${ink}">${escapeXml(name)}</text>
  <text x="396" y="432" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" letter-spacing="4" fill="${accent}">INVITACIÓN DIGITAL</text>
  <text x="396" y="466" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="11" letter-spacing="2" fill="${ink}" opacity=".4">invify</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // TTL corto a propósito: el SVG depende del código, y un s-maxage de una
      // semana dejaba congelada en el CDN una versión defectuosa.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
