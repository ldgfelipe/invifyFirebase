// ============================================================================
// CATALOG VIEW (cliente) - Contenido localizado del catálogo. Las páginas
// /templates son servidor (SEO + datos) y delegan aquí los textos ES/EN.
// ============================================================================
"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import { TemplateCard } from "./TemplateCard";
import type { Template, TemplateCategory } from "@/lib/types";

export interface CatalogCategory {
  id: TemplateCategory;
  label: string;
  labelEn: string;
}

export function CatalogView({
  templates,
  categories,
  activeId = null,
}: {
  templates: Template[];
  categories: CatalogCategory[];
  activeId?: TemplateCategory | null;
}) {
  const { locale, t } = useLanguage();
  const isEn = locale === "en";
  const active = activeId ? categories.find((c) => c.id === activeId) : undefined;
  const activeLabel = active ? (isEn ? active.labelEn : active.label) : "";

  const title = active
    ? isEn
      ? `${activeLabel} templates`
      : `Plantillas de ${activeLabel}`
    : t.catalog.title;
  const subtitle = active
    ? `${t.catalog.findPerfect} ${activeLabel.toLowerCase()}.`
    : `${templates.length} ${t.catalog.subtitle}`;

  const catLabel = (id: string) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return id;
    return isEn ? c.labelEn : c.label;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      {active && (
        <nav className="text-sm text-ink/50 mb-4">
          <Link href="/templates" className="hover:text-gold-500">
            {t.catalog.crumb}
          </Link>{" "}
          / <span className="text-ink">{activeLabel}</span>
        </nav>
      )}

      <h1 className="section-title text-center">{title}</h1>
      <p className="text-center text-ink/60 mb-8">{subtitle}</p>

      {!active && (
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <Link href="/templates" className="btn-outline text-sm px-4 py-2">
            {t.catalog.all}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/templates/${c.id}`}
              className="btn-outline text-sm px-4 py-2"
            >
              {isEn ? c.labelEn : c.label}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <TemplateCard key={tpl.id} template={tpl} categoryLabel={catLabel(tpl.category)} />
        ))}
      </div>

      {active && templates.length === 0 && (
        <p className="text-center text-ink/60 py-12">{t.catalog.empty}</p>
      )}
    </div>
  );
}
