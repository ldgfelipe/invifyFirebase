// ============================================================================
// HOME (/) - Landing principal con hero + categorías + catálogo destacado.
// ============================================================================
import Link from "next/link";
import { getActiveTemplates, CATEGORIES } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/site";
import { TemplateCard } from "@/components/catalog/TemplateCard";

export const revalidate = 300;

export default async function HomePage() {
  const templates = await getActiveTemplates();
  const featured = templates.slice(0, 6);
  const settings = await getSiteSettings();

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-champagne">
        <p className="uppercase tracking-[0.3em] text-gold-500 text-sm mb-4">
          ✨ Invify - Invitaciones digitales
        </p>
        <h1 className="font-serif text-5xl md:text-7xl text-ink max-w-3xl">
          {settings.heroTitle}
        </h1>
        <p className="mt-4 text-ink/70 max-w-xl">
          {settings.heroSubtitle}
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/templates" className="btn-primary">
            {settings.heroCta || "Ver catálogo"}
          </Link>
          <Link href="/pricing" className="btn-outline">
            Ver planes
          </Link>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="py-14 px-6 max-w-5xl mx-auto">
        <h2 className="section-title text-center">Explora por categoría</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/templates/${c.id}`}
              className="card p-6 text-center hover:shadow-lg transition"
            >
              <span className="font-serif text-lg text-ink">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTACADOS */}
      <section className="py-14 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="section-title">Plantillas destacadas</h2>
          <Link href="/templates" className="text-gold-500 underline">
            Ver todas
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
