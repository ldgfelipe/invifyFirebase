// ============================================================================
// API /api/thumb/[templateId]
// Genera un thumbnail SVG determinista (800x600) con los colores reales del
// builderConfig.theme de cada plantilla + un motivo por categoría. No depende
// de servicios externos (loremflickr cae con 401 ante hotlink), así el catálogo
// local siempre muestra imagen. Aditivo: no rompe catálogo ni pricing existente.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const CATEGORY_MOTIFS: Record<string, { label: string; accent: string; shape: string }> = {
  boda: {
    label: "Boda",
    accent: "#C9A227",
    shape:
      '<circle cx="400" cy="300" r="120" fill="none" stroke="%ACCENT%" stroke-width="3"/><circle cx="400" cy="300" r="90" fill="none" stroke="%ACCENT%" stroke-width="1.5"/><path d="M400 236l14 24 10-11 10 11 14-24-24 26z" fill="%ACCENT%" opacity=".35"/>',
  },
  cumpleanos: {
    label: "Cumpleaños",
    accent: "#E4572E",
    shape:
      '<path d="M320 360q12-60 80-60t80 60z" fill="%ACCENT%" opacity=".3"/><path d="M352 320l-8-18 18-8-18-8 8-18 18 8V258l8 18 18-8-8 18 18 8-18 8 8 18-18-8v18l-8-18-18 8z" fill="%ACCENT%"/>',
  },
  babyshower: {
    label: "Baby Shower",
    accent: "#4C9A8A",
    shape:
      '<path d="M330 300a70 78 0 0 1 140 0z" fill="none" stroke="%ACCENT%" stroke-width="3"/><path d="M400 302v86" stroke="%ACCENT%" stroke-width="2"/><circle cx="400" cy="330" r="14" fill="none" stroke="%ACCENT%"/>',
  },
  bautizo: {
    label: "Bautizo",
    accent: "#5B7EA6",
    shape:
      '<path d="M400 240v120m0-72l36 40-36-40-36 40" fill="none" stroke="%ACCENT%" stroke-width="3"/><path d="M406 412h-16" stroke="%ACCENT%" stroke-width="3"/>',
  },
  corporativo: {
    label: "Corporativo",
    accent: "#2F5D8A",
    shape:
      '<path d="M340 350v-70h70m0 70v-50h70v50" fill="none" stroke="%ACCENT%" stroke-width="4"/><path d="M340 350h120" stroke="%ACCENT%" stroke-width="4"/>',
  },
};

const FALLBACK_ACCENTS = ["#C9A227", "#2F5D8A", "#4C9A8A", "#E4572E", "#8B5E3C"];

function normalizeThemeColor(c: string | undefined): string {
  if (!c) return "#111111";
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return "#111111";
  return c.length === 4
    ? ("#" + Array.from(c.slice(1)).map((x) => x + x).join(""))
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

export async function GET(
  req: NextRequest,
  { params }: { params: { templateId: string } }
): Promise<NextResponse> {
  const { templateId } = params;

  let primary = "#8B6A2B";
  let background = "#FFFBF2";
  let name = "Invitación";

  try {
    // Lee la plantilla por Admin SDK (el mismo path que el editor usa: con
    // fallback a demoTemplates, ya cubierto en firestore.ts).
    let snap = await adminDb.collection("templates").doc(templateId).get();
    if (!snap.exists) {
      const demo = await adminDb.collection("demoTemplates").doc(templateId).get();
      if (demo.exists) snap = demo;
    }
    if (snap.exists) {
      const data = snap.data() as any;
      const theme = data?.builderConfig?.theme ?? {};
      primary = normalizeThemeColor(theme?.primaryColor) ?? "#8B6A2B";
      background = normalizeThemeColor(theme?.background ?? theme?.backgroundColor) ?? "#FFFFFF";
      name = (data?.name as string) ?? "Invitación";
    }
  } catch {
    // si falla la lectura, usa la paleta por defecto: nunca rompe el catálogo.
  }

  const motif = CATEGORY_MOTIFS[name.toLowerCase().split(" ")[0]] ?? null;
  const category = (await getCategoryIfKnown(templateId)) ?? "";
  const cat = CATEGORY_MOTIFS[category] ?? null;
  const m = cat ?? motif;
  const accent = defaultAccentFor(templateId);
  const shape = (m?.shape ?? "").replaceAll("%ACCENT%", accenttxt(accent));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="${background}"/>
  <g opacity=".55">
    <rect x="-40" y="-40" width="180" height="180" fill="${accent}" opacity=".08" transform="rotate(22 300 260)"/>
    <circle cx="720" cy="80" r="130" fill="${accent}" opacity=".05"/>
    <circle cx="60" cy="520" r="90" fill="${accent}" opacity=".06"/>
  </g>
  <g transform="translate(0,60)">${shape}</g>
  <text x="400" y="440" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${primary}">${escapeXml(name)}</text>
  <text x="400" y="480" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" letter-spacing="4" fill="${accent}">INVITACIÓN DIGITAL</text>
  <text x="400" y="552" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${primary}" opacity=".45">invify · catálogo</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function accenttxt(c: string): string {
  return c.replace("#", "%23").replace("&", "%26");
}

async function getCategoryIfKnown(templateId: string): Promise<string | null> {
  try {
    const snap = await adminDb.collection("templates").doc(templateId).get();
    return snap.exists ? ((snap.data() as any)?.category as string) ?? null : null;
  } catch {
    return null;
  }
}
