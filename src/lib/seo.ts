// ============================================================================
// SEO / Enlaces sociales - helpers reutilizables
// ============================================================================
import type { SeoMeta } from "./types";

// canonical de producción. Un localhost en el .env local gana sobre el .env
// durante el build (Next prioriza .env.local), lo que horneaba
// http://localhost:3000 en el sitemap y el robots.txt de producción; aquí se
// descarta para que ambos apunten siempre al dominio real.
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export const SITE_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(RAW_SITE_URL)
  ? "https://invify.online"
  : RAW_SITE_URL || "https://invify.online";

/** Construye la URL absoluta de una invitación pública (SSR / metadata). */
export function invitationUrl(slug: string): string {
  return `${SITE_URL}/i/${slug}`;
}

/** Origen en runtime (cliente): window.location.origin, fallback SITE_URL en SSR. */
export function getCurrentOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return SITE_URL;
}

/** URL de invitación usando el origen donde se ejecuta (cliente) — cumple requisito de URL dinámica. */
export function invitationUrlRuntime(slug: string): string {
  return `${getCurrentOrigin()}/i/${slug}`;
}

/** Deep link de WhatsApp con texto preconfigurado. */
export function whatsappShareUrl(text: string, url: string): string {
  const msg = encodeURIComponent(`${text} ${url}`);
  return `https://wa.me/?text=${msg}`;
}

/** Mailto de compartir. */
export function emailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Metadatos base del sitio para Next.js metadata API. */
export function buildMetadata(meta: SeoMeta) {
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.url,
      images: meta.imageUrl ? [{ url: meta.imageUrl }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: meta.title,
      description: meta.description,
      images: meta.imageUrl ? [meta.imageUrl] : [],
    },
    alternates: { canonical: meta.url },
  };
}
