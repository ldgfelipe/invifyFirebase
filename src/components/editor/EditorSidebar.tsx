"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { isModuleAllowed, FREE_FEATURES } from "@/lib/plans";
import type { InvitationModule, PlanFeatures } from "@/lib/types";

interface EditorSidebarProps {
  modules: InvitationModule[];
  selectedId: string | null;
  features?: PlanFeatures;
  onSelect: (id: string | null) => void;
  onAdd: (type: InvitationModule["type"]) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}

const MODULE_TYPES: { type: InvitationModule["type"]; label: string; icon: string }[] = [
  { type: "header", label: "Cabecera", icon: "🎯" },
  { type: "text", label: "Texto libre", icon: "📝" },
  { type: "preloader", label: "Precargador", icon: "⏳" },
  { type: "countdown", label: "Cuenta regresiva", icon: "⏰" },
  { type: "audio", label: "Audio", icon: "🔊" },
  { type: "carousel", label: "Carrusel", icon: "🖼️" },
  { type: "location", label: "Ubicación", icon: "📍" },
  { type: "dresscode", label: "Dresscode", icon: "👗" },
  { type: "itinerary", label: "Itinerario", icon: "📅" },
  { type: "giftTable", label: "Mesa de regalos", icon: "🎁" },
  { type: "quiz", label: "Quiz", icon: "❓" },
  { type: "rsvp", label: "RSVP", icon: "✅" },
];

export function EditorSidebar({
  modules,
  selectedId,
  features = FREE_FEATURES,
  onSelect,
  onAdd,
  onRemove,
  onReorder,
}: EditorSidebarProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, id: string, index: number) {
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (fromIndex !== targetIndex) onReorder(fromIndex, targetIndex);
    setDraggingId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-3">
      {/* Módulos existentes */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-widest text-ink/40 px-2 mb-2">Módulos activos</h4>
        {modules.map((m, i) => (
          <div
            key={m.id}
            draggable
            onDragStart={(e) => handleDragStart(e, m.id, i)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition",
              selectedId === m.id
                ? "bg-gold-50 border border-gold-300"
                : "bg-white border border-ink/10 hover:border-gold-200",
              draggingId === m.id && "opacity-50"
            )}
            onClick={() => onSelect(selectedId === m.id ? null : m.id)}
          >
            <span className="text-xl">{getIcon(m.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-ink truncate">{getLabel(m.type)}</p>
              <p className="text-xs text-ink/50 truncate">
                {getModuleSummary(m)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(m.id); }}
                className="p-1 text-ink/40 hover:text-red-500 rounded"
                title="Eliminar"
              >
                ✕
              </button>
              <span className="text-ink/30 cursor-grab">⋮⋮</span>
            </div>
          </div>
        ))}
        {modules.length === 0 && (
          <p className="text-center text-ink/40 text-sm py-8">Sin módulos. Añade uno abajo.</p>
        )}
      </div>

      {/* Añadir módulo */}
      <div className="border-t border-ink/10 pt-4 space-y-2">
        <h4 className="text-xs uppercase tracking-widest text-ink/40 px-2 mb-2">Añadir módulo</h4>
        <div className="grid grid-cols-2 gap-2">
          {MODULE_TYPES.map((t) => {
            const locked = !isModuleAllowed(t.type, features);
            return (
              <button
                key={t.type}
                onClick={() => onAdd(t.type)}
                disabled={locked}
                title={locked ? "Incluido en el plan Pro o Premium" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition",
                  locked
                    ? "border-ink/5 opacity-45 cursor-not-allowed"
                    : "border-ink/10 hover:border-gold-300 hover:bg-gold-50"
                )}
              >
                <span className="text-2xl">{locked ? "🔒" : t.icon}</span>
                <span className="text-xs font-medium text-ink/70">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    header: "🎯",
    text: "📝",
    preloader: "⏳",
    countdown: "⏰",
    audio: "🔊",
    carousel: "🖼️",
    location: "📍",
    dresscode: "👗",
    itinerary: "📅",
    giftTable: "🎁",
    quiz: "❓",
    rsvp: "✅",
  };
  return icons[type] ?? "📦";
}

function getLabel(type: string): string {
  const labels: Record<string, string> = {
    header: "Cabecera",
    text: "Texto libre",
    preloader: "Precargador",
    countdown: "Cuenta regresiva",
    audio: "Audio",
    carousel: "Carrusel",
    location: "Ubicación",
    dresscode: "Dresscode",
    itinerary: "Itinerario",
    giftTable: "Mesa de regalos",
    quiz: "Quiz",
    rsvp: "RSVP",
  };
  return labels[type] ?? type;
}

function getModuleSummary(m: InvitationModule): string {
  if (!m.visible) return "Oculto";
  switch (m.type) {
    case "header":
      return (m as any).title ?? "Sin título";
    case "text":
      return ((m as any).title ?? (m as any).content ?? "").slice(0, 24) || "Texto";
    case "countdown":
      return (m as any).targetDate ?? "Sin fecha";
    case "carousel":
      return `${(m as any).images?.length ?? 0} imágenes`;
    case "location":
      return (m as any).venue ?? "Sin lugar";
    case "quiz":
      return `${(m as any).questions?.length ?? 0} preguntas`;
    case "rsvp":
      return (m as any).title ?? "RSVP";
    default:
      return "Configurado";
  }
}