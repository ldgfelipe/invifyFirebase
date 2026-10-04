// ============================================================================
// IMÁGENES DEL CATÁLOGO - Resolución de miniaturas tolerante a datos viejos.
//
// Las plantillas se sembraron con URLs de loremflickr. Ese host ya no sirve
// fotos: responde 401 "Bot check / Javascript is needed" a cualquier petición
// sin navegador, así que no hay forma de recalentarlo desde el navegador ni de
// descargarlo sin más. Se recuperaron una a una y ahora están en Firebase
// Storage (scripts/migrate-template-images.cjs).
//
// Este módulo sigue tratando loremflickr y picsum como hosts muertos a propósito:
// son la red de seguridad para documentos viejos o plantillas que genere la IA
// con URLs externas. Cuando una plantilla ya tiene foto en Storage, lo primero
// que se cumple es que la URL es válida y se respeta tal cual.
// ============================================================================

/** Hosts que ya no sirven imágenes por hotlink. */
const DEAD_IMAGE_HOSTS = ["loremflickr.com", "picsum.photos"];

/** Versión del placeholder SVG: súbala al cambiar su diseño. */
const THUMB_VERSION = "?v=4";

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
 *  1. URL local /api/thumb/... o remota viva (incluida una de Storage): se
 *     respeta. Las 31 plantillas ya están en este caso.
 *  2. /api/thumb/<id>: SVG con los colores y el motivo de su categoría.
 *  3. Lock derivado del id, si tampoco se puede leer la plantilla.
 *
 * `?v=4` versiona la URL del SVG para que el CDN no siga sirviendo la versión
 * anterior cuando cambia su código. Bájalo solo si cambia el diseño.
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

/**
 * Imagen horizontal (1200x630) de la plantilla para compartir en redes.
 * El catálogo usa la vertical de resolveTemplateThumb porque su tarjeta es 4:5;
 * aquí hace falta la apaisada, que es la que esperan WhatsApp, Instagram y
 * Facebook al previsualizar un enlace.
 */
export function resolveTemplateOgImage(templateId: string, thumbnailUrl?: string): string {
  const url = (thumbnailUrl ?? "").trim();
  if (url.startsWith("http") && !isDeadImageUrl(url)) return url;
  if (templateId) return `/api/thumb/${encodeURIComponent(templateId)}${THUMB_VERSION}&size=og`;
  return `/api/thumb/lock/1${THUMB_VERSION}&size=og`;
}
