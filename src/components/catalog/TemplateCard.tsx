// ============================================================================
// TEMPLATE CARD - Tarjeta de plantilla para el catálogo (SEO-friendly).
// Enlaza a /pricing?template=<id> iniciando el flujo de selección + auth.
// ============================================================================
import Link from "next/link";
import type { Template } from "@/lib/types";

export function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="card group overflow-hidden hover:shadow-lg transition">
      <Link
        href={`/templates/demo/${template.id}`}
        className="relative block aspect-[4/5] bg-champagne"
        aria-label={`Ver demo de ${template.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.thumbnailUrl}
          alt={`Plantilla ${template.name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          loading="lazy"
        />
        <span className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition bg-white/95 text-ink font-medium text-sm px-4 py-2 rounded-full shadow">
            Ver demo
          </span>
        </span>
      </Link>
      <div className="p-4">
        <h3 className="font-serif text-xl text-ink">{template.name}</h3>
        <p className="text-sm text-ink/60 capitalize mb-3">{template.category}</p>
        <Link href={`/pricing?template=${template.id}`} className="btn-primary w-full text-center text-sm">
          Elegir y personalizar
        </Link>
      </div>
    </div>
  );
}
