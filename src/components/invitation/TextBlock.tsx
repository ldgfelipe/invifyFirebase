"use client";

import type { TextModule } from "@/lib/types";

export function TextBlock({ module }: { module: TextModule }) {
  const align = module.align ?? "center";
  return (
    <section className="py-10 px-6 max-w-3xl mx-auto">
      {module.title && (
        <h2 className="font-serif text-2xl text-center mb-4 text-ink">{module.title}</h2>
      )}
      <div
        className="prose prose-ink max-w-none"
        style={{ textAlign: align as any }}
        dangerouslySetInnerHTML={{ __html: module.content || "<p>Escribe tu mensaje aquí...</p>" }}
      />
    </section>
  );
}
