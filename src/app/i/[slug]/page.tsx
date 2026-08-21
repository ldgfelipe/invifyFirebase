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

// ISR: regenera la página cada 5 min (rápida + fresca para SEO).
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const inv = await getPublishedInvitationBySlug(params.slug);
  if (!inv) return { title: "Invitación no encontrada" };

  const url = invitationUrl(inv.slug);
  const image = inv.meta?.imageUrl ?? findImage(inv);
  const description =
    inv.meta?.description ??
    `Te invito a ${inv.title}. Confirmación y detalles en la invitación.`;

  return {
    title: inv.title,
    description,
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

// Busca la primera imagen útil del builderConfig para el OG image.
function findImage(inv: any): string | undefined {
  for (const m of inv.builderConfig?.modules ?? []) {
    if (m.type === "header" && m.imageUrl) return m.imageUrl;
    if (m.type === "carousel" && m.images?.[0]?.url) return m.images[0].url;
  }
  return inv.meta?.imageUrl;
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
      <InvitationRenderer config={inv.builderConfig} invitationId={inv.id} />
    </>
  );
}
