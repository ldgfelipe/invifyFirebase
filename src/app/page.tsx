// ============================================================================
// HOME (/) - Landing principal con hero + categorías + catálogo destacado.
// ============================================================================
import { getActiveTemplates, CATEGORIES } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/site";
import { HomeCatalog } from "@/components/catalog/HomeCatalog";
import { Hero } from "@/components/Hero";
import { PromoBanner } from "@/components/PromoBanner";
import { AiCta } from "@/components/aiwiz/AiCta";
import { AIPromo } from "@/components/aiwiz/AIPromo";

export const revalidate = 300;

export default async function HomePage() {
  const templates = await getActiveTemplates();
  const featured = templates.slice(0, 6);
  const settings = await getSiteSettings();

  // Foto de muestra para la sección del asistente de IA. Antes ese hueco era un
  // rectángulo vacío con un icono; se toma de una plantilla real ya subida a
  // Storage. Se elige una boda si la hay, porque es la categoría que mejor explica
  // el producto; si no, la primera que exista.
  const muestra =
    templates.find((t) => t.category === "boda") ?? templates[0] ?? null;
  const previewUrl = muestra?.thumbnailUrl || "";
  const previewName = muestra?.name || "";

  return (
    <div>
      <Hero settings={settings} />

      <PromoBanner banner={settings.banner} page="home" />

      {/* INVITACIÓN CON IA */}
      <AiCta />

      <AIPromo previewUrl={previewUrl} previewName={previewName} />

      <HomeCatalog templates={featured} categories={CATEGORIES} />
    </div>
  );
}
