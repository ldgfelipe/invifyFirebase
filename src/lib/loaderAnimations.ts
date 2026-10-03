// ============================================================================
// ANIMACIONES DE LOADER - Catálogo de animaciones para la pantalla de carga.
//
// Antes el preloader free mostraba una cuenta atrás de 5 s. Eso es legible pero
// no attractive: no comunica nada de la invitación y parece un formulario
// esperando. Aquí se sustituye por animaciones cortas que usan los colores del
// propio tema (--invify-primary), de modo que cada plantilla muestra algo
// coherente con su diseño.
//
// Una plantilla puede fijar `animation` en su módulo preloader. Si no lo hace,
// `resolveLoaderAnimation` devuelve una al azar para que dos invitaciones no
// muestren siempre la misma.
// ============================================================================

export const LOADER_ANIMATIONS = [
  { id: "envelope", label: "Sobre que se abre", labelEn: "Opening envelope" },
  { id: "rings", label: "Anillos de boda", labelEn: "Wedding rings" },
  { id: "hearts", label: "Corazones flotantes", labelEn: "Floating hearts" },
  { id: "petals", label: "Pétalos cayendo", labelEn: "Falling petals" },
  { id: "seal", label: "Sello de lacre", labelEn: "Wax seal" },
  { id: "monogram", label: "Monograma con trazo", labelEn: "Drawn monogram" },
  { id: "ribbon", label: "Lazo de cinta", labelEn: "Ribbon bow" },
  { id: "sparkle", label: "Destellos", labelEn: "Sparkles" },
] as const;

export type LoaderAnimationId = (typeof LOADER_ANIMATIONS)[number]["id"];

/** "random" = elige una en cada carga. Es el valor por defecto de las plantillas. */
export type LoaderAnimationSetting = LoaderAnimationId | "random";

const VALID = new Set<string>(LOADER_ANIMATIONS.map((a) => a.id));

export function isLoaderAnimationId(value: unknown): value is LoaderAnimationId {
  return typeof value === "string" && VALID.has(value);
}

/**
 * Traduce lo guardado en Firestore a un id válido.
 * Cualquier valor desconocido (incluido "random" o un id borrado) cae en
 * "random", de modo que una plantilla antigua nunca se queda sin animación.
 */
export function normalizeLoaderAnimation(value: unknown): LoaderAnimationSetting {
  return isLoaderAnimationId(value) ? value : "random";
}

/** Elige una animación al azar entre todas las disponibles. */
export function pickRandomLoaderAnimation(): LoaderAnimationId {
  const pool = LOADER_ANIMATIONS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

/**
 * Devuelve el id concreto que se debe pintar.
 * `random` (o un valor no válido) se resuelve con `pickRandomLoaderAnimation`.
 */
export function resolveLoaderAnimation(value: unknown): LoaderAnimationId {
  return isLoaderAnimationId(value) ? value : pickRandomLoaderAnimation();
}