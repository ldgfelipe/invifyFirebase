"use client";

// ============================================================================
// CAROUSEL - Galería de imágenes con transición automática y controles.
// ============================================================================
import { useState } from "react";
import type { CarouselImage } from "@/lib/types";

interface Props {
  images: CarouselImage[];
}

export function Carousel({ images }: Props) {
  const [index, setIndex] = useState(0);
  if (!images.length) return null;

  const go = (dir: number) =>
    setIndex((i) => (i + dir + images.length) % images.length);

  return (
    <section className="py-12 px-6">
      <div className="relative max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index].url}
          alt={images[index].caption ?? ""}
          className="w-full h-[420px] object-cover"
        />
        {images[index].caption && (
          <p className="absolute bottom-0 inset-x-0 bg-ink/60 text-cream text-sm py-2 text-center">
            {images[index].caption}
          </p>
        )}
        <button
          onClick={() => go(-1)}
          aria-label="Anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 text-ink"
        >
          ‹
        </button>
        <button
          onClick={() => go(1)}
          aria-label="Siguiente"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 text-ink"
        >
          ›
        </button>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Ir a imagen ${i + 1}`}
            className={`w-2.5 h-2.5 rounded-full ${i === index ? "bg-gold-500" : "bg-ink/20"}`}
          />
        ))}
      </div>
    </section>
  );
}
