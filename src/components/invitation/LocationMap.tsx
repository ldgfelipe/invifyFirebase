// ============================================================================
// LOCATION - Datos del lugar + mapa embebido (iframe de OpenStreetMap/Google).
//
// Nota sobre el bug anterior: se usaba `module.mapUrl ?? fallback`, pero el
// seed guarda `mapUrl: ""`. El operador ?? solo_activa con null/undefined, así
// que la cadena vacía pasaba tal cual y el iframe quedaba con src="" (mapa en
// blanco). Ahora se trata la cadena vacía como ausente, igual que un 0 suelto
// en las coordenadas.
// ============================================================================
import type { LocationModule } from "@/lib/types";

/** URL de embed de OpenStreetMap centrada en lat/lng con un margen razonable. */
function buildOsmUrl(lat: number, lng: number): string {
  const span = 0.008;
  const bbox = [
    (lng - span).toFixed(5),
    (lat - span).toFixed(5),
    (lng + span).toFixed(5),
    (lat + span).toFixed(5),
  ].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function isValidCoord(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function LocationMap({ module }: { module: LocationModule }) {
  // Una cadena vacía cuenta como "sin URL", igual que null/undefined.
  const customUrl = typeof module.mapUrl === "string" ? module.mapUrl.trim() : "";
  const hasCoords = isValidCoord(module.lat) && isValidCoord(module.lng);

  const mapUrl = customUrl || (hasCoords ? buildOsmUrl(module.lat, module.lng) : "");

  // Enlace "cómo llegar": preferimos las coordenadas; si no hay, buscamos por
  // nombre del lugar para que el botón nunca quede apuntando a (0,0).
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${module.lat},${module.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [module.venue, module.address].filter(Boolean).join(", ") || "ubicación del evento"
      )}`;

  return (
    <section className="py-14 px-6 max-w-4xl mx-auto text-center">
      <h2 className="section-title">Ubicación</h2>
      {module.venue && <p className="font-serif text-2xl text-gold-500 mt-2">{module.venue}</p>}
      {module.address && <p className="text-ink/70 mt-1">{module.address}</p>}

      {mapUrl ? (
        <div className="mt-6 rounded-2xl overflow-hidden shadow-soft">
          <iframe
            title={`Mapa del evento${module.venue ? `: ${module.venue}` : ""}`}
            src={mapUrl}
            width="100%"
            height="320"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="border-0 w-full"
          />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/20 p-6 text-sm text-ink/50">
          Este evento todavía no tiene coordenadas configuradas. Agrega la ubicación en el
          editor para mostrar el mapa.
        </div>
      )}

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-outline inline-block mt-4"
      >
        Cómo llegar
      </a>
    </section>
  );
}
