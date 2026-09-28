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

  return (
    <div>
      <Hero settings={settings} />

      <PromoBanner banner={settings.banner} page="home" />

      {/* INVITACIÓN CON IA */}
      <AiCta />

      <AIPromo />

      <HomeCatalog templates={featured} categories={CATEGORIES} />
    </div>
  );
}
