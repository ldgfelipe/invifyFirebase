// ============================================================================
// HEADER - Portada de la invitación (título, nombres, fecha, imagen).
// ============================================================================
import type { HeaderModule } from "@/lib/types";

export function Header({ module }: { module: HeaderModule }) {
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
        {module.date && (
          <p className="text-ink/70 text-lg">{module.date}</p>
        )}
      </div>
    </header>
  );
}
