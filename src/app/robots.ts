// ============================================================================
// ROBOTS - Directivas para rastreadores (este es el robots.txt real: lo genera
// Next, por eso cualquier robots.txt estático en /public o en la raíz se
// ignora). Permite todo el contenido público y bloquea solo áreas privadas.
//
// Los agentes de IA se listan uno por grupo con "Allow: /". No es obligatorio
// (un bot no listado cae en el grupo "*", que también permite), pero lo hace
// explícito para que los verificadores que solo buscan su propio grupo no lo
// reporten como bloqueado.
// Referencia el sitemap.
// ============================================================================
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Áreas que nunca se rastrean: datos personales, API, panel y login.
 * /cuenta no existe hoy, pero se bloquea por si se crea más adelante.
 * /i/* contiene invitaciones particulares: el sitemap las excluye a propósito.
 */
const PRIVATE = ["/api/", "/dashboard/", "/admin/", "/login", "/cuenta/", "/i/"];

/** Buscadores y asistentes de IA con acceso explícito al contenido público. */
const AI_AND_SEARCH_AGENTS = [
  // Google: Googlebot indexa; Google-Extended alimenta a Gemini/AI Overviews.
  "Googlebot",
  "Google-Extended",
  "GoogleOther",
  "AdsBot-Google",
  // OpenAI
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Meta
  "meta-externalagent",
  "meta-externalfetcher",
  // Microsoft / Bing
  "Bingbot",
  "BingPreview",
  "Copilot-Discovery",
  // Apple
  "Applebot",
  "Applebot-Extended",
  // Otros asistentes y agregadores
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "DuckAssistBot",
  "DuckDuckBot",
  "Diffbot",
  "YouBot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "AI2Bot",
  "Omgilibot",
  "Timpibot",
  "SemrushBot",
  "AhrefsBot",
  "MJ12bot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...AI_AND_SEARCH_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
