// ============================================================================
// LANDING POR CATEGORÍA /templates/[category] - URL amigable y indexable.
// Servidor (SEO + datos) + CatalogView cliente para textos ES/EN.
// ============================================================================
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveTemplates, CATEGORIES } from "@/lib/catalog";
import { CatalogView } from "@/components/catalog/CatalogView";

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
  const templates = await getActiveTemplates(params.category as any);

  return (
    <CatalogView templates={templates} categories={CATEGORIES} activeId={params.category as any} />
  );
}
