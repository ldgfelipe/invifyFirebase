import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTemplateById } from "@/lib/catalog";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { DemoBar } from "@/components/catalog/DemoBar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: { templateId: string };
}): Promise<Metadata> {
  const template = await getTemplateById(params.templateId);
  if (!template) return { title: "Demo no disponible | Invify" };
  return {
    title: `Demo: ${template.name} | Invify`,
    description: `Vista previa de la plantilla ${template.name} de Invify. Puedes personalizarla con tu información antes de publicarla.`,
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