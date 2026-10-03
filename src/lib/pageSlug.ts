// ============================================================================
// SLUG DE PUBLICACIÓN - Normalizacion de rutas del CMS (/pages).
//
// Archivo aparte de /lib/slug (que es para slugs de invitacion) y sin imports
// de firebase-admin, para que el componente cliente del editor de paginas
// (/admin/pages/[id]) pueda usarlo sin arrastrar el SDK de servidor al bundle.
// ============================================================================

/** Normaliza un slug de pagina a formato de ruta: "Nosotros " -> "/nosotros". */
export function normalizePageSlug(slug: string): string {
  let s = (slug ?? "").trim().toLowerCase();
  if (!s) return "/";
  if (!s.startsWith("/")) s = `/${s}`;
  // Sin barras duplicadas y sin barra final (salvo la home).
  s = s.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return s;
}