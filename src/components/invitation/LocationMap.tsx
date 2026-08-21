// ============================================================================
// LOCATION - Datos del lugar + mapa embebido (iframe de OpenStreetMap/Google).
// ============================================================================
import type { LocationModule } from "@/lib/types";

export function LocationMap({ module }: { module: LocationModule }) {
  const mapUrl =
    module.mapUrl ??
    `https://www.openstreetmap.org/export/embed.html?bbox=${
      module.lng - 0.01
    }%2C${module.lat - 0.01}%2C${module.lng + 0.01}%2C${module.lat + 0.01}&layer=mapnik&marker=${module.lat}%2C${module.lng}`;

  return (
    <section className="py-14 px-6 max-w-4xl mx-auto text-center">
      <h2 className="section-title">Ubicación</h2>
      <p className="font-serif text-2xl text-gold-500 mt-2">{module.venue}</p>
      <p className="text-ink/70 mt-1">{module.address}</p>
      <div className="mt-6 rounded-2xl overflow-hidden shadow-soft">
        <iframe
          title="Mapa del evento"
          src={mapUrl}
          width="100%"
          height="320"
          loading="lazy"
          className="border-0 w-full"
        />
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${module.lat},${module.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-outline inline-block mt-4"
      >
        Cómo llegar
      </a>
    </section>
  );
}
