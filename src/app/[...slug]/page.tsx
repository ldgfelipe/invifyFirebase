// ============================================================================
// PÁGINA PÚBLICA /[...slug] - Sirve las publicaciones del CMS (/pages).
//
// El panel admin (/admin/pages) gestionaba estas páginas, pero no existía ruta
// pública que las sirviera: todo lo creado ahí devolvía 404. Esta ruta cubre
// slugs como /nosotros o /servicios.
//
// Solo las páginas con status "published" se sirven; el resto da 404 igual que
// una URL inexistente, para no filtrar borradores.
//
// Next da prioridad a las rutas más específicas, así que /templates,
// /pricing, /i/[slug], /admin/*, etc. siguen resolviéndose aquí donde siempre.
// ============================================================================
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedPageBySlug, pickPageImage } from "@/lib/pages";
import { normalizePageSlug as normalizeSlug } from "@/lib/pageSlug";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { SITE_URL } from "@/lib/seo";

// ISR corta: el contenido cambia desde el panel, no hace falta regenerar antes.
export const revalidate = 300;

/** Normaliza el slug del path completo ("/a/b/" -> "/a/b"). */
function slugFromSegments(segments: string[]): string {
  return normalizeSlug(segments.join("/"));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Promise<Metadata> {
  const page = await getPublishedPageBySlug(slugFromSegments(params.slug));
  if (!page) {
    return { title: "Página no encontrada", robots: { index: false, follow: false } };
  }

  const url = `${SITE_URL}${normalizeSlug(page.slug)}`;
  const title = page.seoTitle?.trim() || page.title;
  const description =
    page.metaDescription?.trim() ||
    `Invitaciones digitales para ${page.title.toLowerCase()}. Personaliza y comparte en minutos.`;
  const image = pickPageImage(page);

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      images: image ? [{ url: image }] : [],
      type: "website",
      siteName: "Invify",
      locale: "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
    alternates: { canonical: url },
  };
}

export default async function PublicPage({ params }: { params: { slug: string[] } }) {
  const page = await getPublishedPageBySlug(slugFromSegments(params.slug));
  if (!page) notFound();

  const url = `${SITE_URL}${normalizeSlug(page.slug)}`;
  const image = pickPageImage(page);

  // Datos estructurados para que Google entienda de qué trata la página.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.seoTitle?.trim() || page.title,
    url,
    description: page.metaDescription?.trim() || page.title,
    ...(image ? { image: [image] } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* demo=true: sin gating de plan ni escritura de RSVP/quiz.
          tier="premium": salta el ConditionalPreloader. Con el valor por
          defecto ("free") el contenido se oculta tras una pantalla de carga de
          5 s con publicidad, y ademas no se renderiza en el servidor: Google
          recibiria HTML vacio. Una pagina de marketing debe servirse completa. */}
      <InvitationRenderer
        config={page.builderConfig}
        invitationId={`page_${page.id}`}
        demo
        tier="premium"
      />
    </>
  );
}