// ============================================================================
// ROBOTS - Directivas para rastreadores. Permite el sitio salvo áreas
// privadas (/api, /dashboard). Referencia el sitemap.
// ============================================================================
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Solo se bloquean áreas privadas. El contenido público (home, catálogo,
  // demos de plantilla, precios) queda abierto, también para rastreadores de
  // IA, para que puedan indexar y citar el sitio. /i/* se mantiene bloqueado
  // porque las invitaciones son particulares y el sitemap las excluye.
  const privatePaths = ["/api/", "/dashboard/", "/admin/", "/login", "/i/"];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      { userAgent: "GPTBot", allow: "/", disallow: privatePaths },
      { userAgent: "ChatGPT-User", allow: "/", disallow: privatePaths },
      { userAgent: "Google-Extended", allow: "/", disallow: privatePaths },
      { userAgent: "PerplexityBot", allow: "/", disallow: privatePaths },
      { userAgent: "ClaudeBot", allow: "/", disallow: privatePaths },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
