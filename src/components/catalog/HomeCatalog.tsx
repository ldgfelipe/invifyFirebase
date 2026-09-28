// ============================================================================
// HOME CATALOG (cliente) - Secciones de categorías + destacados del home,
// localizadas ES/EN. El home sigue siendo servidor (SEO + datos).
// ============================================================================
"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import { TemplateCard } from "./TemplateCard";
import type { CatalogCategory } from "./CatalogView";
import type { Template } from "@/lib/types";

export function HomeCatalog({
  templates,
  categories,
}: {
  templates: Template[];
  categories: CatalogCategory[];
}) {
  const { locale, t } = useLanguage();
  const isEn = locale === "en";

  const labelOf = (id: string) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return id;
    return isEn ? c.labelEn : c.label;
  };

  return (
    <>
      {/* CATEGORÍAS */}
      <section className="py-14 px-6 max-w-5xl mx-auto">
        <h2 className="section-title text-center">{t.catalog.exploreByCategory}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/templates/${c.id}`}
              className="card p-6 text-center hover:shadow-lg transition"
            >
              <span className="font-serif text-lg text-ink">
                {isEn ? c.labelEn : c.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTACADOS */}
      <section className="py-14 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="section-title">{t.catalog.featured}</h2>
          <Link href="/templates" className="text-gold-500 underline">
            {t.catalog.viewAll}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} categoryLabel={labelOf(tpl.category)} />
          ))}
        </div>
      </section>
    </>
  );
}
