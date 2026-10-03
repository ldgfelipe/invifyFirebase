// ============================================================================
// SITEMAP - Rutas públicas indexables. /i/* EXCLUIDO a propósito: las
// invitaciones son particulares (privadas) y no deben indexarse.
//
// Incluye las publicaciones del CMS (/pages) que estén publicadas: antes se
// administraban desde el panel pero ninguna aparecía aquí ni tenía ruta
// pública, así que nunca se indexaban.
// ============================================================================
import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/catalog";
import { SITE_URL } from "@/lib/seo";
import { getPublishedPages } from "@/lib/pages";
import { normalizePageSlug as normalizeSlug } from "@/lib/pageSlug";

export const revalidate = 3600;

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

  const pages = await getPublishedPages().catch(() => [] as Awaited<ReturnType<typeof getPublishedPages>>);

  const pageRoutes = pages.map((p) => ({
    url: `${SITE_URL}${normalizeSlug(p.slug)}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...pageRoutes];
}