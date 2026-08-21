// ============================================================================
// LANDING POR CATEGORÍA /templates/[category] - URL amigable y indexable.
// ============================================================================
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveTemplates, CATEGORIES } from "@/lib/catalog";
import { TemplateCard } from "@/components/catalog/TemplateCard";
import Link from "next/link";

export const revalidate = 300;

const VALID = new Set(CATEGORIES.map((c) => c.id));

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const cat = CATEGORIES.find((c) => c.id === params.category);
  if (!cat) return { title: "Categoría no encontrada" };
  return {
    title: `Plantillas de ${cat.label}`,
    description: `Invitaciones digitales de ${cat.label.toLowerCase()} personalizables y compartibles por WhatsApp.`,
    alternates: { canonical: `/templates/${cat.id}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  if (!VALID.has(params.category as any)) notFound();
  const cat = CATEGORIES.find((c) => c.id === params.category)!;
  const templates = await getActiveTemplates(params.category as any);

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <nav className="text-sm text-ink/50 mb-4">
        <Link href="/templates" className="hover:text-gold-500">
          Catálogo
        </Link>{" "}
        / <span className="text-ink">{cat.label}</span>
      </nav>

      <h1 className="section-title">Plantillas de {cat.label}</h1>
      <p className="text-ink/60 mb-8">
        Encuentra el diseño perfecto para tu {cat.label.toLowerCase()}.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>

      {templates.length === 0 && (
        <p className="text-center text-ink/60 py-12">
          Próximamente más diseños para esta categoría.
        </p>
      )}
    </div>
  );
}
