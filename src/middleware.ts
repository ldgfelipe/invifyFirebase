// ============================================================================
// MIDDLEWARE - Barrera de rutas privadas.
//
// ESTADO REAL, verificado en App Hosting con sondas (29/09/2026):
//
// 1. El middleware SI se ejecuta. Antes se creyo que no, porque los deploys de
//    prueba se hicieron con "firebase deploy --only hosting", que va al hosting
//    clasico (invify-online.web.app) y no a App Hosting, que es el que sirve
//    invify.online. Con un push a git y una sonda en una ruta inexistente, la
//    respuesta fue la del middleware. Tarda unos 5 minutos en desplegar.
//
// 2. El bloqueo por User-Agent NO puede funcionar en App Hosting. El runtime
//    sobrescribe la cabecera user-agent con el literal "Google" (6 caracteres)
//    en cualquier peticion, tanto por el dominio custom como por la URL de
//    App Hosting. Por eso isCrawler() nunca coincide. No es un problema de la
//    lista de tokens ni de codigo: el dato no llega.
//
// 3. Para devolver 401/403 a quien no tenga sesion hay que usar una cookie de
//    sesion de Firebase verificada aqui, no el user-agent.
//
// Lo que protege hoy el sitio, verificado respondiendo sin sesion:
//   - /api/invitations/*  -> 401 {"error":"No autenticado"}
//   - /api/admin/*        -> 401/403 {"error":"No autorizado"}
//   - /api/cron/*         -> exige CRON_SECRET
//   - Reglas de Firestore: solo ownerUid o admin leen y escriben.
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

    // Navegador real sin sesión: el layout cliente redirige a /login.
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
  matcher: ["/admin/:path*", "/dashboard/:path*", "/thanks", "/login"],
};
