// ============================================================================
// SEO / Enlaces sociales - helpers reutilizables
// ============================================================================
import type { SeoMeta } from "./types";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Construye la URL absoluta de una invitación pública. */
export function invitationUrl(slug: string): string {
  return `${SITE_URL}/i/${slug}`;
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
