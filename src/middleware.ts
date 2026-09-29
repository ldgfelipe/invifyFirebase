// ============================================================================
// MIDDLEWARE - Barrera de rutas privadas para rastreadores y usuarios.
//
// /admin y /dashboard solo validan la sesión en el cliente (AuthContext +
// useEffect), así que el HTML se servía con 200 a cualquiera, incluidos bots.
// Aquí se cierra esa puerta sin tocar el flujo de login:
//
//   - Si la petición a una ruta privada viene de un rastreador, se responde 403
//     con cuerpo mínimo. El bot nunca recibe el shell del panel.
//   - Toda ruta privada (y /thanks) sale siempre con X-Robots-Tag noindex, para
//     que ni siquiera un rastreador que pase se la indexe.
//   - Las páginas públicas no se tocan: siguen abiertas para Google-Extended,
//     Googlebot y el resto de agentes de IA.
//
// La autorización real de datos no depende de esto: la siguen aplicando las
// reglas de Firestore y la comprobación de rol en las APIs de admin.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";

/** Prefijos que exigen sesión. */
const PRIVATE_PREFIXES = ["/admin", "/dashboard"];

/** Páginas que no deben indexarse aunque respondan 200. */
const NOINDEX_PREFIXES = [...PRIVATE_PREFIXES, "/thanks", "/login"];

/**
 * Tokens de user-agent de rastreadores. Se comparan como substring para
 * cubrir variantes (por ejemplo "Googlebot-Image" o "bingbot/2.0").
 * La lista es deliberadamente explícita: un "bot" genérico bloquearía
 * navegadores legítimos.
 */
const CRAWLER_TOKENS = [
  "googlebot", "google-extended", "googleother", "adsbot-google", "google-inspectiontool",
  "bingbot", "bingpreview", "msnbot", "adidxbot", "slurp", "duckduckgo", "duckduckbot",
  "yandex", "baiduspider", "sogou", "exabot", "facebot", "petalbot", "applebot",
  "gptbot", "chatgpt-user", "oai-searchbot", "ccbot", "anthropic-ai", "claudebot",
  "claude-user", "claude-searchbot", "perplexitybot", "perplexity-user", "youbot",
  "meta-externalagent", "meta-externalfetcher", "bytespider", "amazonbot", "applebot-extended",
  "cohere-ai", "cohere-training-data-crawler", "ai2bot", "diffbot", "omgilibot", "timpibot",
  "semrushbot", "ahrefsbot", "mj12bot", "dotbot", "rogerbot", "screaming frog",
  "archive.org_bot", "ia_archiver", "web.archive.org", "feedfetcher", "petal",
  "uptimerobot", "pingdom", "lighthouse", "chrome-lighthouse", "pagespeed", "gtmetrix",
];

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_TOKENS.some((t) => ua.includes(t));
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (startsWithAny(pathname, PRIVATE_PREFIXES)) {
    if (isCrawler(req.headers.get("user-agent"))) {
      // 403 con cuerpo mínimo: el rastreador no obtiene el shell del panel.
      return new NextResponse("403 Forbidden", {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
          "Cache-Control": "no-store",
        },
      });
    }

    // Navegador real sin sesión: el layout cliente redirige a /login. Aquí solo
    // se marca como no indexable.
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  if (startsWithAny(pathname, NOINDEX_PREFIXES)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // Contenido público: sin cambios, para no interferir con los agentes de IA.
  return NextResponse.next();
}

export const config = {
  // Solo las rutas que necesitan intervención; el resto se sirve normal.
  matcher: ["/admin/:path*", "/dashboard/:path*", "/thanks", "/login"],
};
