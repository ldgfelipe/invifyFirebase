// ============================================================================
// SITEMAP - Solo rutas públicas indexables. /i/* EXCLUIDO a propósito:
// las invitaciones son particulares (privadas) y no deben indexarse.
// ============================================================================
import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/catalog";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/templates",
    "/pricing",
    "/contacto",
    "/aviso-privacidad",
    ...CATEGORIES.map((c) => `/templates/${c.id}`),
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  return staticRoutes;
}
