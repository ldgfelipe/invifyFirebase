import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTemplateById } from "@/lib/catalog";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";

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

      {/* Barra flotante de navegación del demo */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,480px)]">
        <div className="card p-4 flex items-center justify-between gap-3 shadow-xl">
          <div className="min-w-0">
            <p className="font-serif text-lg text-ink leading-tight truncate">
              {template.name}
            </p>
            <p className="text-xs text-ink/60">Vista previa de la plantilla</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/pricing?template=${template.id}`} className="btn-primary text-sm">
              Elegir y personalizar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}