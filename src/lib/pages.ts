// ============================================================================
// PÁGINAS / CMS - Lectura en servidor de la colección /pages.
//
// Hasta ahora /pages solo se administraba desde el panel: no existía ninguna
// ruta pública que la sirviera, así que toda publicación daba 404. Estas
// funciones son la capa de datos de la ruta pública y del sitemap.
//
// Solo devolvemos páginas publicadas: un draft nunca debe ser accesible ni
// indexable, aunque su slug se conozca.
// ============================================================================
import { adminDb } from "@/lib/firebase/admin";
import { normalizePageSlug as normalizeSlug } from "@/lib/pageSlug";
import type { Page } from "@/lib/types";

const COLLECTION = "pages";

export { normalizeSlug };

function isPublished(p: Page | undefined): p is Page {
  return Boolean(p) && p?.status === "published";
}

/**
 * Busca una página publicada por slug. Acepta el slug con o sin barra inicial,
 * que es como lo escribe la gente en el panel.
 */
export async function getPublishedPageBySlug(slug: string): Promise<Page | null> {
  const target = normalizeSlug(slug);
  const snap = await adminDb.collection(COLLECTION).get();
  for (const d of snap.docs) {
    const page = d.data() as Page;
    if (normalizeSlug(page.slug) === target && isPublished(page)) {
      return { ...page, id: d.id };
    }
  }
  return null;
}

/** Todas las páginas publicadas, para el sitemap. */
export async function getPublishedPages(): Promise<Page[]> {
  const snap = await adminDb.collection(COLLECTION).get();
  return snap.docs
    .map((d) => ({ ...(d.data() as Page), id: d.id }))
    .filter(isPublished)
    // La home se sirve desde /, no desde su propio slug.
    .filter((p) => !p.isHome && normalizeSlug(p.slug) !== "/");
}

/**
 * Imagen para Open Graph de una página: primero la que sube el admin, si no la
 * primera imagen de sus módulos, si no nada.
 */
export function pickPageImage(page: Page): string | undefined {
  if (page.metaImage) return page.metaImage;
  for (const m of page.builderConfig?.modules ?? []) {
    const mod = m as any;
    if (mod.visible === false) continue;
    if (mod.type === "header" && mod.imageUrl) return mod.imageUrl;
    if (mod.type === "carousel" && mod.images?.[0]?.url) return mod.images[0].url;
  }
  return undefined;
}