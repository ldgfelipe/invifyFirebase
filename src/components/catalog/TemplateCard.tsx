// ============================================================================
// TEMPLATE CARD - Tarjeta de plantilla para el catálogo (SEO-friendly).
// Enlaza a /pricing?template=<id> iniciando el flujo de selección + auth.
// ============================================================================
import Link from "next/link";
import type { Template } from "@/lib/types";

export function TemplateCard({ template }: { template: Template }) {
  return (
    <Link
      href={`/pricing?template=${template.id}`}
      className="card group hover:shadow-lg transition block"
    >
      <div className="relative aspect-[4/5] bg-champagne">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.thumbnailUrl}
          alt={`Plantilla ${template.name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="font-serif text-xl text-ink">{template.name}</h3>
        <p className="text-sm text-ink/60 capitalize">{template.category}</p>
      </div>
    </Link>
  );
}
