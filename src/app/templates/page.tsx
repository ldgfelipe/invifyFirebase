// ============================================================================
// CATÁLOGO /templates - Grid indexable de todas las plantillas activas.
// Servidor (SEO + datos) + CatalogView cliente para textos ES/EN.
// ============================================================================
import type { Metadata } from "next";
import { getActiveTemplates, CATEGORIES } from "@/lib/catalog";
import { CatalogView } from "@/components/catalog/CatalogView";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Catálogo de plantillas",
  description:
    "Explora plantillas de invitaciones digitales para bodas, cumpleaños, baby showers y más. Elige, personaliza y comparte.",
  alternates: { canonical: "/templates" },
};

export default async function CatalogPage() {
  const templates = await getActiveTemplates();

  return <CatalogView templates={templates} categories={CATEGORIES} activeId={null} />;
}
