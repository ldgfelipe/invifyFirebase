// ============================================================================
// CATÁLOGO /templates - Grid indexable de todas las plantillas activas.
// ============================================================================
import type { Metadata } from "next";
import { getActiveTemplates, CATEGORIES } from "@/lib/catalog";
import { TemplateCard } from "@/components/catalog/TemplateCard";
import Link from "next/link";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Catálogo de plantillas",
  description:
    "Explora plantillas de invitaciones digitales para bodas, cumpleaños, baby showers y más. Elige, personaliza y comparte.",
  alternates: { canonical: "/templates" },
};

export default async function CatalogPage() {
  const templates = await getActiveTemplates();

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="section-title text-center">Catálogo de plantillas</h1>
      <p className="text-center text-ink/60 mb-8">
        {templates.length} diseños listos para personalizar.
      </p>

      {/* Filtros por categoría (indexables) */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <Link href="/templates" className="btn-outline text-sm px-4 py-2">
          Todas
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/templates/${c.id}`}
            className="btn-outline text-sm px-4 py-2"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    </div>
  );
}
