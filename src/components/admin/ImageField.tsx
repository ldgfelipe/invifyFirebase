// ============================================================================
// ImageField - Campo de imagen con subida directa a Firebase Storage.
//
// Reemplaza el flujo "sube la foto a postimages.org y pega la URL", que era la
// causa de que el catálogo quedara con imágenes rotas. Muestra la vista previa,
// permite quitar la imagen y avisa mientras sube.
// ============================================================================
"use client";

import { useRef, useState } from "react";
import { uploadAdminImage, type UploadTarget } from "@/lib/imageUploadAdmin";

export function ImageField({
  label,
  value,
  onChange,
  target,
  id,
  hint,
  aspect = "aspect-[3/2]",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  target: UploadTarget;
  id: string;
  hint?: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadAdminImage(file, target, id);
      onChange(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo subir la imagen";
      setError(msg);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mb-4">
      <label className="text-sm text-ink/70 block mb-1">{label}</label>

      <div className={`${aspect} w-full rounded-lg border border-ink/10 bg-champagne overflow-hidden mb-2`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/40 text-sm">
            Sin imagen
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-outline text-sm disabled:opacity-50"
        >
          {busy ? "Subiendo…" : value ? "Reemplazar foto" : "Subir foto"}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={busy}
            className="text-sm text-ink/50 hover:text-red-600 disabled:opacity-50"
          >
            Quitar
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {hint && <p className="text-xs text-ink/50 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}