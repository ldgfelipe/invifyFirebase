// ============================================================================
// ADMIN / RESUMEN - Punto de entrada del panel. Enlaces a la gestión de
// contenido que alimenta las landing pages (plantillas, planes, copy del sitio).
// ============================================================================
import Link from "next/link";

export default function AdminDashboard() {
  const cards = [
    {
      href: "/admin/templates",
      title: "Plantillas",
      desc: "Catálogo y landings por categoría. Crea y edita el diseño (builderConfig).",
    },
    {
      href: "/admin/plans",
      title: "Planes",
      desc: "Básico, Premium y VIP. Define precio y features mostrados en /pricing.",
    },
    {
      href: "/admin/settings",
      title: "Sitio / Landing",
      desc: "Hero, subtítulo, CTA y meta descripción de la home.",
    },
  ];

  return (
    <div>
      <h1 className="section-title">Panel de administración</h1>
      <p className="text-ink/60 mb-8">
        Gestiona el contenido que se muestra en las landing pages públicas.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card p-6 hover:shadow-lg transition">
            <h2 className="font-serif text-xl text-ink">{c.title}</h2>
            <p className="text-sm text-ink/60 mt-2">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
