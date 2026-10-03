import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTemplateById } from "@/lib/catalog";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { DemoBar } from "@/components/catalog/DemoBar";
import { resolveTemplateOgImage } from "@/lib/catalogImages";
import { invitationUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: { templateId: string };
}): Promise<Metadata> {
  const template = await getTemplateById(params.templateId);
  if (!template) return { title: "Demo no disponible | Invify" };

  const description = `Vista previa de la plantilla ${template.name} de Invify. Puedes personalizarla con tu información antes de publicarla.`;
  const url = invitationUrl(`/templates/demo/${template.id}`);
  const image = resolveTemplateOgImage(template.id, template.thumbnailUrl);

  return {
    title: `Demo: ${template.name} | Invify`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${template.name} · Plantilla de Invify`,
      description,
      url,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: template.name }],
    },
    twitter: { card: "summary_large_image", title: template.name, description, images: [image] },
  };
}

export default async function TemplateDemoPage({
  params,
}: {
  params: { templateId: string };
}) {
  const template = await getTemplateById(params.templateId);
  if (!template) notFound();

  return (
    <div>
      <InvitationRenderer config={template.builderConfig} invitationId="demo" demo />

      <DemoBar templateId={template.id} templateName={template.name} />
    </div>
  );
}