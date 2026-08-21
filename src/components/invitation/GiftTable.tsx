// ============================================================================
// GIFT TABLE - Mesa de regalos (opcional, con enlace por ítem).
// ============================================================================
import type { GiftTableModule } from "@/lib/types";

export function GiftTable({ module }: { module: GiftTableModule }) {
  return (
    <section className="py-14 px-6 max-w-3xl mx-auto">
      <h2 className="section-title text-center mb-8">Mesa de regalos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {module.items.map((g, i) => (
          <div key={i} className="card p-5 flex gap-4 items-center">
            {g.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <p className="font-serif text-lg text-ink">{g.name}</p>
              {g.description && (
                <p className="text-sm text-ink/60">{g.description}</p>
              )}
            </div>
            {g.url && (
              <a
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-sm px-4 py-2"
              >
                Regalar
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
