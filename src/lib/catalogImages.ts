// ============================================================================
// IMÁGENES DEL CATÁLOGO - Resolución de miniaturas tolerante a datos viejos.
// Las plantillas creadas antes de la migración guardan URLs de loremflickr,
// que responde 401 ante hotlink y deja el catálogo (y el hero) sin imagen.
// Aquí se detecta el host muerto y se cae a la miniatura local, que se genera
// con los colores reales y el motivo de la categoría de cada plantilla.
// ============================================================================

/** Hosts que ya no sirven imágenes por hotlink. */
const DEAD_IMAGE_HOSTS = ["loremflickr.com", "picsum.photos"];

/** Versión del placeholder SVG: súbela al cambiar su diseño. */
const THUMB_VERSION = "?v=2";

/** Añade (o refresca) el parámetro de versión sin duplicarlo. */
function withVersion(url: string): string {
  return url.includes("?v=") ? url : `${url}${THUMB_VERSION}`;
}

/** ¿La URL apunta a un host que devuelve 401? */
export function isDeadImageUrl(url: string | undefined | null): boolean {
  const u = (url ?? "").trim();
  if (!u) return false;
  return DEAD_IMAGE_HOSTS.some((h) => u.includes(h));
}

/**
 * Miniatura de una plantilla.
 *  1. URL local /api/thumb/... (la del seed) o remota viva: se respeta.
 *  2. /api/thumb/<id>: SVG con los colores y el motivo de su categoría.
 *  3. Lock derivado del id, si tampoco se puede leer la plantilla.
 *
 * `?v=2` versiona la URL para que el CDN no siga sirviendo el SVG anterior
 * cuando cambia su código. Bájalo solo si cambia el diseño del placeholder.
 */
export function resolveTemplateThumb(templateId: string, thumbnailUrl?: string): string {
  const url = (thumbnailUrl ?? "").trim();
  if (url.startsWith("/api/thumb/")) return withVersion(url);
  if (url.startsWith("http") && !isDeadImageUrl(url)) return url;
  if (templateId) return `/api/thumb/${encodeURIComponent(templateId)}${THUMB_VERSION}`;
  return `/api/thumb/lock/1${THUMB_VERSION}`;
}

/** Imagen de fondo del hero: si el host está muerto, se omite el velo. */
export function resolveHeroBackground(url: string | undefined | null): string {
  const u = (url ?? "").trim();
  if (!u || isDeadImageUrl(u)) return "";
  return u;
}
