// ============================================================================
// SITEMAP - Genera sitemap.xml indexable (home, catálogo, categorías, planes,
// y todas las invitaciones publicadas para SEO).
// ============================================================================
import type { MetadataRoute } from "next";
import { CATEGORIES, getAllPublishedSlugs } from "@/lib/catalog";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/templates",
    "/pricing",
    ...CATEGORIES.map((c) => `/templates/${c.id}`),
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  let slugs: string[] = [];
  try {
    slugs = await getAllPublishedSlugs();
  } catch {
    slugs = [];
  }
  const invitationRoutes = slugs.map((slug) => ({
    url: `${SITE_URL}/i/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...invitationRoutes];
}
