"use client";

import { useMemo, useState } from "react";

type Props = {
  onSelect: (url: string) => void;
  onClose: () => void;
};

const PRESET_KEYWORDS = [
  "wedding",
  "birthday",
  "baby",
  "baptism",
  "corporate",
  "love",
  "party",
  "flowers",
  "elegant",
  "tropical",
  "vintage",
  "confetti",
];

export function ImageBank({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState("wedding");
  const [lockOffset, setLockOffset] = useState(0);

  // Antes usaba loremflickr.com, que devuelve 401 ante hotlink y dejaba el
  // banco en blanco. Ahora las imágenes se sirven desde /api/thumb/lock/N:
  // sin dependencias externas y con caché. La palabra clave sigue sirviendo
  // para elegir una familia distinta de imágenes.
  const base = useMemo(() => {
    let h = 0x811c9dc5;
    const q = (query || "invify").toLowerCase();
    for (let i = 0; i < q.length; i++) {
      h ^= q.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return (h % 70) + 1;
  }, [query]);

  const images = Array.from({ length: 12 }, (_, i) => {
    const lock = base + i + lockOffset * 12;
    return `/api/thumb/lock/${lock}`;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-ink/10 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg text-ink">Banco de imágenes</h3>
            <p className="text-xs text-ink/50">
              Busca por palabra clave y haz clic para agregar. Se sirven desde tu propio dominio.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full">✕</button>
        </div>

        <div className="p-4 border-b border-ink/5 space-y-3">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Buscar: wedding, birthday, baby, baptism, corporate, love..."
              value={query}
              onChange={(e) => setQuery(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") setLockOffset((n) => n + 1);
              }}
            />
            <button onClick={() => setLockOffset((n) => n + 1)} className="btn-outline text-sm px-4">
              ↻ Más
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_KEYWORDS.map((k) => (
              <button
                key={k}
                onClick={() => {
                  setQuery(k);
                  setLockOffset(0);
                }}
                className={`text-xs px-2.5 py-1 rounded-full border capitalize ${query === k ? "bg-gold-500 text-white border-gold-500" : "bg-white border-ink/10 hover:border-gold-200"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink/40">
            Tip: también puedes subir tus propias imágenes — se convertirán a <strong>.webp</strong> y se guardarán en tu invitación (máx 5MB).
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((url) => (
              <button
                key={url}
                onClick={() => {
                  onSelect(url);
                  onClose();
                }}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-ink/10 hover:border-gold-300 hover:shadow-md transition"
                title="Clic para usar esta imagen"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={query} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                <span className="absolute bottom-1 left-1 bg-white/90 text-[10px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition">Usar</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-ink/10 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
