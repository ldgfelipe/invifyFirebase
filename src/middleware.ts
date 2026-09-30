// ============================================================================
// MIDDLEWARE - Barrera de rutas privadas para rastreadores.
//
// ALCANCE REAL (verificado en produccion, 29/09/2026 con tres pruebas):
// este middleware NO se ejecuta en el hosting actual. Firebase Hosting con
// "frameworksBackend" compila el bundle (Next lo reporta como "f Middleware")
// pero nunca lo invoca. Las pruebas fueron:
//   1. Cabecera de diagnostico en todas las rutas: nunca llego al cliente.
//   2. 403 a un user-agent de Google-Extended: seguia devolviendo 200.
//   3. Redirect incondicional en /thanks: tampoco se produjo.
// Ojo con un falso positivo: /thanks y /login devuelven "X-Robots-Tag: noindex,
// nofollow" porque Next lo genera a partir de la metadata robots, no porque pase
// por aqui. Y /admin y /dashboard reciben sus cabeceras desde firebase.json,
// que si las aplica el edge.
//
// Lo que SI protege hoy, verificado respondiendo sin sesion:
//   - /api/invitations/*  -> 401 {"error":"No autenticado"}
//   - /api/admin/*        -> 401/403 {"error":"No autorizado"}
//   - /api/cron/*         -> exige CRON_SECRET
//   - Reglas de Firestore: solo ownerUid o admin leen y escriben.
//
// Este archivo se mantiene porque es la logica correcta y se activara sola al
// migrar a un runtime que ejecute middleware (Firebase App Hosting / Cloud Run).
// Si se busca un 403 real a rastreadores hoy, la via es autenticacion por cookie
// de sesion validada en el servidor, no el user-agent.
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
