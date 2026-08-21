"use client";

// ============================================================================
// PRELOADER - Pantalla de carga con fade al entrar a la invitación.
// ============================================================================
import { useEffect, useState } from "react";

export function Preloader({ imageUrl, text }: { imageUrl?: string; text?: string }) {
  const [hidden, setHidden] = useState(false);

  // Auto-oculta tras 2.2s; también permite tocar para entrar. Oculta si hay
  // preferencia de movimiento reducido.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setHidden(true);
      return;
    }
    const t = setTimeout(() => setHidden(true), 2200);
    return () => clearTimeout(t);
  }, []);

  if (hidden) return null;

  return (
    <div
      onClick={() => setHidden(true)}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink cursor-pointer"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="w-32 h-32 rounded-full object-cover mb-6 animate-pulse" />
      ) : (
        <div className="w-20 h-20 rounded-full border-2 border-gold-300 border-t-transparent animate-spin mb-6" />
      )}
      <p className="font-serif text-gold-300 text-xl tracking-wide">
        {text ?? "Cargando invitación..."}
      </p>
    </div>
  );
}
