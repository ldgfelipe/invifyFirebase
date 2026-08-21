// ============================================================================
// ITINERARY - Cronograma del evento.
// ============================================================================
import type { ItineraryModule } from "@/lib/types";

export function Itinerary({ module }: { module: ItineraryModule }) {
  return (
    <section className="py-14 px-6 max-w-2xl mx-auto">
      <h2 className="section-title text-center mb-8">Itinerario</h2>
      <ol className="relative border-l-2 border-gold-200 ml-3">
        {module.items.map((it, i) => (
          <li key={i} className="mb-8 ml-6">
            <span className="absolute -left-[11px] w-5 h-5 rounded-full bg-gold-300 border-4 border-cream" />
            <p className="font-serif text-xl text-ink">{it.time} · {it.title}</p>
            {it.description && (
              <p className="text-ink/70 mt-1">{it.description}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
