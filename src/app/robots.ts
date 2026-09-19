// ============================================================================
// ROBOTS - Directivas para rastreadores. Permite el sitio salvo áreas
// privadas (/api, /dashboard). Referencia el sitemap.
// ============================================================================
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/i/", "/admin/"],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/i/", "/api/", "/dashboard/", "/admin/"],
      },
      {
        userAgent: "ChatGPT-User",
        disallow: ["/i/", "/api/", "/dashboard/", "/admin/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
