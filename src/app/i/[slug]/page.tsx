// ============================================================================
// PÁGINA PÚBLICA /i/[slug] - Render SSR de la invitación.
// SEO: metadata dinámica (Open Graph) + datos estructurados (Event schema).
// ============================================================================
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedInvitationBySlug } from "@/lib/firestore";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { ViewCounter } from "@/components/invitation/ViewCounter";
import { invitationUrl } from "@/lib/seo";
import { isDeadImageUrl, resolveTemplateOgImage } from "@/lib/catalogImages";
import { getInvitationFeatures } from "@/lib/plans";

// ISR: regenera la página cada 5 min (rápida + fresca para SEO).
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const inv = await getPublishedInvitationBySlug(params.slug);
  if (!inv) return { title: "Invitación no encontrada", robots: { index: false, follow: false } };

  const url = invitationUrl(inv.slug);
  const image = inv.meta?.imageUrl ?? findImage(inv);
  const description =
    inv.meta?.description ??
    `Te invito a ${inv.title}. Confirmación y detalles en la invitación.`;

  return {
    title: inv.title,
    description,
    // Invitaciones son privadas: no indexar (particulares de clientes)
    robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
    openGraph: {
      title: inv.title,
      description,
      url,
      images: image ? [{ url: image }] : [],
      type: "website",
    },
    twitter: { card: "summary_large_image", title: inv.title, description, images: image ? [image] : [] },
    alternates: { canonical: url },
  };
}

/**
 * Busca la primera imagen útil del builderConfig para el OG image.
 *
 * Las plantillas antiguas guardan URLs de loremflickr, que hoy responde 401: si
 * se emitieran tal cual, WhatsApp y Facebook mostrarían un preview roto. Se
 * descartan y, si no queda ninguna, se cae a la miniatura generada de la
 * plantilla (ver resolveTemplateOgImage).
 *
 * OJO: esa miniatura es SVG y las redes sociales no la renderizan. Para un
 * preview real hay que subir una foto desde el editor; mientras no exista, es
 * preferible a un enlace muerto.
 */
function findImage(inv: any): string | undefined {
  const usable = (u: unknown) =>
    typeof u === "string" && u.startsWith("http") && !isDeadImageUrl(u);

  for (const m of inv.builderConfig?.modules ?? []) {
    if (m.type === "header" && usable(m.imageUrl)) return m.imageUrl;
    if (m.type === "carousel" && usable(m.images?.[0]?.url)) return m.images[0].url;
  }
  if (usable(inv.meta?.imageUrl)) return inv.meta.imageUrl;

  const templateId = inv.templateId ?? inv.builderConfig?.templateId;
  if (typeof templateId === "string" && templateId) return resolveTemplateOgImage(templateId);
  return undefined;
}

export default async function InvitationPage({
  params,
}: {
  params: { slug: string };
}) {
  const inv = await getPublishedInvitationBySlug(params.slug);
  if (!inv) notFound();

  // Datos estructurados para rich results en buscadores (Event schema).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: inv.title,
    url: invitationUrl(inv.slug),
    description: inv.meta?.description ?? inv.title,
    ...(inv.meta?.imageUrl ? { image: [inv.meta.imageUrl] } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewCounter invitationId={inv.id} />
      <InvitationRenderer
        config={inv.builderConfig}
        invitationId={inv.id}
        tier={inv.tier ?? "free"}
        features={getInvitationFeatures(inv)}
      />
    </>
  );
}
