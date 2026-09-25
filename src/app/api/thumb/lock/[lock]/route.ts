// ============================================================================
// API /api/thumb/lock/[lock]
// Genera una imagen decorativa abstracta y determinista a partir de un número.
// Existe porque el catálogo, los hero y los carruseles referencian
// /api/thumb/lock/N (dos segmentos), ruta que NO cubría /api/thumb/[templateId]
// (un solo segmento) y por eso devolvía 404. Al no existir, los carruseles de
// las plantillas salían sin imagen.
//
// Se sirve desde el propio dominio: nada de loremflickr ni picsum.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Paleta sobria acorde al branding (dorado, tinta, verde, teal, terracota).
const PALETTES: { bg: string; ink: string; accent: string }[] = [
  { bg: "#FFFBF2", ink: "#8B6A2B", accent: "#C9A227" },
  { bg: "#0F172A", ink: "#F8FAFC", accent: "#C9A227" },
  { bg: "#F3FFF0", ink: "#2F6B3A", accent: "#4C9A8A" },
  { bg: "#F0F6FF", ink: "#2563EB", accent: "#2F5D8A" },
  { bg: "#FFF9E6", ink: "#FF6B6B", accent: "#E4572E" },
  { bg: "#F7F7F7", ink: "#111111", accent: "#8B6A2B" },
  { bg: "#FAF5FF", ink: "#7C3AED", accent: "#A78BFA" },
  { bg: "#ECFDF5", ink: "#047857", accent: "#34D399" },
];

/** Hash determinista (FNV-1a) para que el mismo N siempre luzca igual. */
function hash(n: number, salt: string): number {
  let h = 0x811c9dc5;
  const input = `${salt}:${n}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { lock: string } }
): Promise<NextResponse> {
  const parsed = Number.parseInt(params.lock, 10);
  const n = Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  const size = req.nextUrl.searchParams.get("size") === "sm" ? 400 : 800;
  const w = size;
  const h = size === 400 ? 400 : 600;

  const p = PALETTES[hash(n, "palette") % PALETTES.length];
  const variant = hash(n, "variant") % 4;

  // Tres compositions distintas para que el carrusel no se vea repetido.
  let art = "";
  if (variant === 0) {
    // Arcos concéntricos
    art = [0, 1, 2, 3]
      .map((i) => `<circle cx="${w / 2}" cy="${h / 2}" r="${90 + i * 52}" fill="none" stroke="${p.accent}" stroke-width="${i === 0 ? 3 : 1.5}" opacity="${0.5 - i * 0.08}"/>`)
      .join("");
  } else if (variant === 1) {
    // Ondas
    art = [0, 1, 2]
      .map(
        (i) =>
          `<path d="M0 ${h * (0.45 + i * 0.12)} q ${w / 4} -50 ${w / 2} 0 t ${w / 2} 0 v ${h} H0 z" fill="${p.accent}" opacity="${0.12 - i * 0.03}"/>`
      )
      .join("");
  } else if (variant === 2) {
    // Diagonales
    art = [0, 1, 2, 3, 4]
      .map(
        (i) =>
          `<rect x="${-60 + i * 90}" y="-60" width="34" height="${h + 120}" fill="${p.accent}" opacity="0.10" transform="rotate(24 ${w / 2} ${h / 2})"/>`
      )
      .join("");
  } else {
    // Pétalos
    art = [0, 1, 2, 3, 4, 5]
      .map((i) => {
        const a = (i * Math.PI) / 3;
        const cx = w / 2 + Math.cos(a) * 70;
        const cy = h / 2 + Math.sin(a) * 70;
        return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="66" ry="30" fill="${p.accent}" opacity="0.16" transform="rotate(${((i * 60) % 180).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      })
      .join("");
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${p.bg}"/>
  <g>${art}</g>
  <circle cx="${w / 2}" cy="${h / 2}" r="7" fill="${p.accent}" opacity="0.5"/>
  <text x="${w / 2}" y="${h - 28}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" letter-spacing="3" fill="${p.ink}" opacity="0.35">INVIFY</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
