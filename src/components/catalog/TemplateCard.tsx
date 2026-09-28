// ============================================================================
// TEMPLATE CARD - Tarjeta de plantilla para el catálogo (SEO-friendly).
// Enlaza a /pricing?template=<id> iniciando el flujo de selección + auth.
// Textos localizados ES/EN vía useLanguage.
// ============================================================================
"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import type { Template } from "@/lib/types";

export function TemplateCard({
  template,
  categoryLabel,
}: {
  template: Template;
  categoryLabel?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="card group overflow-hidden hover:shadow-lg transition">
      <Link
        href={`/templates/demo/${template.id}`}
        className="relative block aspect-[4/5] bg-champagne"
        aria-label={`${t.catalog.viewDemo}: ${template.name}`}
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
            {t.catalog.viewDemo}
          </span>
        </span>
      </Link>
      <div className="p-4">
        <h3 className="font-serif text-xl text-ink">{template.name}</h3>
        <p className="text-sm text-ink/60 capitalize mb-3">
          {categoryLabel ?? template.category}
        </p>
        <Link href={`/pricing?template=${template.id}`} className="btn-primary w-full text-center text-sm">
          {t.catalog.choose}
        </Link>
      </div>
    </div>
  );
}
