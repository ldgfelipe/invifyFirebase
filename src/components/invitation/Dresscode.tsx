// ============================================================================
// DRESSCODE - Código de vestimenta sugerido.
// ============================================================================
import type { DresscodeModule } from "@/lib/types";

export function Dresscode({ module }: { module: DresscodeModule }) {
  return (
    <section className="py-14 px-6 text-center bg-champagne">
      <h2 className="section-title">Dresscode</h2>
      <p className="font-serif text-3xl text-gold-500 mt-2">{module.code}</p>
      {module.description && (
        <p className="text-ink/70 mt-3 max-w-xl mx-auto">{module.description}</p>
      )}
      {module.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={module.imageUrl}
          alt="Referencia de vestimenta"
          className="mx-auto mt-6 w-48 h-64 object-cover rounded-xl shadow-soft"
        />
      )}
    </section>
  );
}
