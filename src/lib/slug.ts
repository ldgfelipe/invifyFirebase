// ============================================================================
// SLUG - Generación y validación de slugs únicos para /i/<slug>
// ============================================================================

/**
 * Normaliza un texto a slug URL-friendly (minúsculas, sin acentos, guiones).
 */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFKD") // descompone acentos
    .replace(/[̀-ͯ]/g, "") // elimina diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // no alfanum -> guion
    .replace(/^-+|-+$/g, "") // quita guiones extremos
    .slice(0, 60);
}

/**
 * Genera un slug candidato único añadiendo un sufijo corto si es necesario.
 * Verifica contra Firestore a través del callable pasado como checkExists.
 */
export async function generateUniqueSlug(
  desired: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(desired) || "invitacion";
  let candidate = base;
  let attempt = 0;
  while (await checkExists(candidate)) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
    if (attempt > 50) {
      // Fallback con aleatorio para evitar colisión infinita.
      candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      break;
    }
  }
  return candidate;
}

// Palabras reservadas que no pueden usarse como slug (rutas del sitio).
export const RESERVED_SLUGS = new Set([
  "i",
  "api",
  "auth",
  "pricing",
  "templates",
  "dashboard",
  "sitemap",
  "robots",
  "admin",
]);
