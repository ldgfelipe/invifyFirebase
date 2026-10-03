// ============================================================================
// HEADER - Portada de la invitación (título, nombres, fecha, imagen).
// ============================================================================
import type { HeaderModule } from "@/lib/types";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * El header guarda la fecha como ISO ("2026-08-12T17:00:00"). Se muestra en
 * castellano y sin hora; si no es una fecha valida se devuelve tal cual para
 * no perder informacion.
 */
function formatEsDate(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  const suffix = hh === 12 ? "12:00" : hh > 12 ? `${hh - 12}:${mm}` : `${hh}:${mm}`;
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()} · ${suffix}`;
}

export function Header({ module }: { module: HeaderModule }) {
  const dateText = formatEsDate(module.date);
  return (
    <header className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-20 bg-champagne">
      {module.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={module.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}
      <div className="relative z-10 max-w-2xl animate-fadeInUp">
        {module.subtitle && (
          <p className="uppercase tracking-[0.3em] text-gold-500 text-sm mb-4">
            {module.subtitle}
          </p>
        )}
        <h1 className="font-serif text-5xl md:text-7xl text-ink mb-4">
          {module.title}
        </h1>
        {module.names && (
          <p className="font-serif text-2xl md:text-3xl text-gold-500 mb-4">
            {module.names}
          </p>
        )}
        {dateText && (
          <p className="text-ink/70 text-lg">{dateText}</p>
        )}
      </div>
    </header>
  );
}
