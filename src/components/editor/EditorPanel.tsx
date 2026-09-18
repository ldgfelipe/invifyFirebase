"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { InvitationModule, BuilderConfig, ModuleStyle } from "@/lib/types";

interface EditorPanelProps {
  module: InvitationModule;
  config: BuilderConfig;
  onUpdate: (updates: Partial<InvitationModule>) => void;
  onRemove: () => void;
  theme: BuilderConfig["theme"];
  onThemeChange: (theme: Partial<BuilderConfig["theme"]>) => void;
}

export function EditorPanel({ module, config, onUpdate, onRemove, theme, onThemeChange }: EditorPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header del panel */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-ink capitalize">{getLabel(module.type)}</h4>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={module.visible}
              onChange={(e) => onUpdate({ visible: e.target.checked })}
            />
            Visible
          </label>
          <button onClick={onRemove} className="p-1 text-ink/40 hover:text-red-500 rounded" title="Eliminar">✕</button>
        </div>
      </div>

      {/* Campos específicos por tipo */}
      <div className="space-y-4">
        {renderModuleFields(module, onUpdate)}
      </div>

      {/* Estilo del módulo (nuevo: cambios drásticos) */}
      <details className="group" open>
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-ink/70">
          <span className="text-purple-500">✨</span> Estilo del módulo
          <span className="text-xs text-ink/40 ml-auto">fondo, imagen, bordes</span>
        </summary>
        <div className="mt-4 space-y-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
          <ModuleStyleEditor
            style={(module as any).style as ModuleStyle | undefined}
            onChange={(style) => onUpdate({ style } as any)}
          />
        </div>
      </details>

      {/* Tema global (siempre visible al final) */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-ink/70">
          <span className="text-gold-500">🎨</span> Tema global
        </summary>
        <div className="mt-4 space-y-4 p-4 bg-ink/5 rounded-lg">
          <div>
            <label className="text-sm text-ink/70">Color primario</label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={theme.primaryColor}
                onChange={(e) => onThemeChange({ primaryColor: e.target.value })}
                className="w-12 h-10 rounded border border-ink/15"
              />
              <input
                type="text"
                value={theme.primaryColor}
                onChange={(e) => onThemeChange({ primaryColor: e.target.value })}
                className="input text-sm w-32 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-ink/70">Fondo</label>
              <input
                type="color"
                value={theme.background}
                onChange={(e) => onThemeChange({ background: e.target.value })}
                className="w-12 h-10 mt-1 rounded border border-ink/15"
              />
            </div>
            <div>
              <label className="text-sm text-ink/70">Color texto global</label>
              <input
                type="color"
                value={(theme as any).textColor ?? "#000000"}
                onChange={(e) => onThemeChange({ textColor: e.target.value } as any)}
                className="w-12 h-10 mt-1 rounded border border-ink/15"
              />
            </div>
          </div>
          <ImageField label="Imagen de fondo global" value={(theme as any).backgroundImage ?? ""} onChange={(v) => onThemeChange({ backgroundImage: v } as any)} />
          <Field label="Overlay global (ej. rgba(0,0,0,0.3))" value={(theme as any).backgroundOverlay ?? ""} onChange={(v) => onThemeChange({ backgroundOverlay: v } as any)} placeholder="rgba(0,0,0,0.3) o vacío" />
          <div>
            <label className="text-sm text-ink/70">Fuente</label>
            <select
              value={theme.fontFamily}
              onChange={(e) => onThemeChange({ fontFamily: e.target.value as any })}
              className="input mt-1 w-full max-w-xs"
            >
              <option value="serif">Serif (elegante)</option>
              <option value="sans">Sans (moderno)</option>
            </select>
          </div>
        </div>
      </details>
    </div>
  );
}

function renderModuleFields(module: InvitationModule, onUpdate: (updates: Partial<InvitationModule>) => void) {
  const m = module as any;

  switch (module.type) {
    case "header":
      return (
        <>
          <Field label="Título" value={m.title} onChange={(v) => onUpdate({ title: v })} />
          <Field label="Subtítulo" value={m.subtitle} onChange={(v) => onUpdate({ subtitle: v })} />
          <Field label="Nombres" value={m.names} onChange={(v) => onUpdate({ names: v })} />
          <Field label="Fecha" type="date" value={m.date} onChange={(v) => onUpdate({ date: v })} />
          <ImageField label="Imagen" value={m.imageUrl} onChange={(v) => onUpdate({ imageUrl: v })} />
        </>
      );
    case "preloader":
      return (
        <>
          <ImageField label="Imagen" value={m.imageUrl} onChange={(v) => onUpdate({ imageUrl: v })} />
          <Field label="Texto" value={m.text} onChange={(v) => onUpdate({ text: v })} />
        </>
      );
    case "countdown":
      return (
        <>
          <Field label="Fecha objetivo" type="date" value={m.targetDate} onChange={(v) => onUpdate({ targetDate: v })} />
          <Field label="Etiqueta" value={m.label} onChange={(v) => onUpdate({ label: v })} />
        </>
      );
    case "audio":
      return (
        <>
          <Field label="URL de audio (MP3/OGG)" value={m.src} onChange={(v) => onUpdate({ src: v })} placeholder="https://..." />
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={m.autoplay}
              onChange={(e) => onUpdate({ autoplay: e.target.checked })}
            />
            Reproducción automática
          </label>
        </>
      );
    case "carousel":
      return (
        <CarouselEditor images={m.images ?? []} onChange={(images) => onUpdate({ images })} />
      );
    case "location":
      return (
        <>
          <Field label="Lugar" value={m.venue} onChange={(v) => onUpdate({ venue: v })} />
          <Field label="Dirección" value={m.address} onChange={(v) => onUpdate({ address: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud" type="number" step="any" value={m.lat} onChange={(v) => onUpdate({ lat: Number(v) })} />
            <Field label="Longitud" type="number" step="any" value={m.lng} onChange={(v) => onUpdate({ lng: Number(v) })} />
          </div>
          <Field label="URL de Google Maps (opcional)" value={m.mapUrl} onChange={(v) => onUpdate({ mapUrl: v })} />
        </>
      );
    case "dresscode":
      return (
        <>
          <Field label="Código" value={m.code} onChange={(v) => onUpdate({ code: v })} />
          <Field label="Descripción" value={m.description} onChange={(v) => onUpdate({ description: v })} multiline />
          <ImageField label="Imagen" value={m.imageUrl} onChange={(v) => onUpdate({ imageUrl: v })} />
        </>
      );
    case "itinerary":
      return (
        <ItineraryEditor items={m.items ?? []} onChange={(items) => onUpdate({ items })} />
      );
    case "giftTable":
      return (
        <GiftTableEditor items={m.items ?? []} onChange={(items) => onUpdate({ items })} />
      );
    case "quiz":
      return (
        <>
          <Field label="Título" value={m.title} onChange={(v) => onUpdate({ title: v })} />
          <QuizEditor questions={m.questions ?? []} onChange={(questions) => onUpdate({ questions })} />
        </>
      );
    case "rsvp":
      return (
        <>
          <Field label="Título" value={m.title} onChange={(v) => onUpdate({ title: v })} />
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={m.collectEmail}
              onChange={(e) => onUpdate({ collectEmail: e.target.checked })}
            />
            Pedir email
          </label>
        </>
      );
    default:
      return <p className="text-ink/50 text-sm">Sin editor para este tipo de módulo.</p>;
  }
}

function getLabel(type: string): string {
  const labels: Record<string, string> = {
    header: "Cabecera",
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

// Componentes de campo reutilizables
function Field({
  label,
  value = "",
  onChange,
  type = "text",
  step,
  placeholder,
  multiline,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-ink/70">{label}</label>
      {multiline ? (
        <textarea
          className="input mt-1 min-h-[80px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
<input
        className="input mt-1"
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      )}
    </div>
  );
}

function ImageField({ label, value = "", onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const [preview, setPreview] = useState<string | null>(value || null);

  return (
    <div className="space-y-2">
      <label className="text-sm text-ink/70">{label}</label>
      <input
        className="input"
        type="url"
        value={value}
        onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }}
        placeholder="https://... (URL directa de imagen)"
      />
      {preview && (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-ink/10">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" onError={() => setPreview(null)} />
        </div>
      )}
      <p className="text-[11px] leading-snug text-ink/45 bg-ink/5 rounded-lg px-2.5 py-2">
        💡 <strong>¿Dónde subo mi imagen gratis?</strong> Usa{" "}
        <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">imgbb.com</a>,{" "}
        <a href="https://postimages.org" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">postimages.org</a>,{" "}
        <a href="https://catbox.moe" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">catbox.moe</a> o{" "}
        <a href="https://imgur.com/upload" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">imgur.com</a> — sube y pega aquí la <em>URL directa</em> (.jpg/.png).
      </p>
    </div>
  );
}

function CarouselEditor({
  images = [],
  onChange,
}: {
  images: { url: string; caption?: string }[];
  onChange: (images: { url: string; caption?: string }[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-ink/70">Imágenes del carrusel</label>
        <span className="text-xs text-ink/50">{images.length} imágenes</span>
      </div>
      <div className="space-y-2">
        {images.map((img, i) => (
          <div key={i} className="flex gap-2 p-3 bg-ink/5 rounded-lg">
            <input
              type="url"
              className="input flex-1"
              value={img.url}
              onChange={(e) => { const n = [...images]; n[i] = { ...n[i], url: e.target.value }; onChange(n); }}
              placeholder="URL imagen"
            />
            <input
              type="text"
              className="input w-32"
              value={img.caption ?? ""}
              onChange={(e) => { const n = [...images]; n[i] = { ...n[i], caption: e.target.value }; onChange(n); }}
              placeholder="Pie"
            />
            <button
              onClick={() => { const n = [...images]; n.splice(i, 1); onChange(n); }}
              className="p-2 text-red-500 hover:bg-red-50 rounded"
              title="Eliminar"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...images, { url: "", caption: "" }])}
          className="btn-outline text-sm w-full"
        >
          + Añadir imagen
        </button>
        <p className="text-[11px] text-ink/45 bg-ink/5 rounded-lg px-2.5 py-2">
          💡 Sube gratis en <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">imgbb.com</a> / <a href="https://postimages.org" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">postimages.org</a> / <a href="https://catbox.moe" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">catbox.moe</a> y pega la URL directa.
        </p>
      </div>
    </div>
  );
}

function ItineraryEditor({
  items = [],
  onChange,
}: {
  items: { time: string; title: string; description?: string }[];
  onChange: (items: { time: string; title: string; description?: string }[]) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-ink/70">Eventos del itinerario</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-3 bg-ink/5 rounded-lg space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Field label="Hora" value={item.time} onChange={(v) => { const n = [...items]; n[i] = { ...n[i], time: v }; onChange(n); }} type="time" />
              <Field label="Título" value={item.title} onChange={(v) => { const n = [...items]; n[i] = { ...n[i], title: v }; onChange(n); }} />
            </div>
            <Field label="Descripción" value={item.description ?? ""} onChange={(v) => { const n = [...items]; n[i] = { ...n[i], description: v }; onChange(n); }} multiline />
            <button
              onClick={() => { const n = [...items]; n.splice(i, 1); onChange(n); }}
              className="text-red-500 text-sm hover:underline"
            >
              Eliminar evento
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, { time: "", title: "", description: "" }])}
          className="btn-outline text-sm w-full"
        >
          + Añadir evento
        </button>
      </div>
    </div>
  );
}

function GiftTableEditor({
  items = [],
  onChange,
}: {
  items: { name: string; description?: string; url?: string; imageUrl?: string }[];
  onChange: (items: { name: string; description?: string; url?: string; imageUrl?: string }[]) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-ink/70">Regalos</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-3 bg-ink/5 rounded-lg space-y-2">
            <Field label="Nombre" value={item.name} onChange={(v) => { const n = [...items]; n[i] = { ...n[i], name: v }; onChange(n); }} />
            <Field label="Descripción" value={item.description ?? ""} onChange={(v) => { const n = [...items]; n[i] = { ...n[i], description: v }; onChange(n); }} multiline />
            <Field label="URL" type="url" value={item.url ?? ""} onChange={(v) => { const n = [...items]; n[i] = { ...n[i], url: v }; onChange(n); }} />
            <ImageField label="Imagen" value={item.imageUrl ?? ""} onChange={(v) => { const n = [...items]; n[i] = { ...n[i], imageUrl: v }; onChange(n); }} />
            <button
              onClick={() => { const n = [...items]; n.splice(i, 1); onChange(n); }}
              className="text-red-500 text-sm hover:underline"
            >
              Eliminar regalo
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, { name: "", description: "", url: "", imageUrl: "" }])}
          className="btn-outline text-sm w-full"
        >
          + Añadir regalo
        </button>
      </div>
    </div>
  );
}

function ModuleStyleEditor({
  style,
  onChange,
}: {
  style?: ModuleStyle;
  onChange: (style: ModuleStyle | undefined) => void;
}) {
  const s = style ?? {};
  function upd(patch: Partial<ModuleStyle>) {
    const next = { ...s, ...patch };
    // limpia vacíos
    Object.keys(next).forEach((k) => {
      if ((next as any)[k] === "" || (next as any)[k] == null) delete (next as any)[k];
    });
    onChange(Object.keys(next).length ? next : undefined);
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink/70">Fondo</label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={s.background ?? "#ffffff"} onChange={(e) => upd({ background: e.target.value })} className="w-10 h-9 rounded border border-ink/15" />
            <input className="input flex-1 text-xs font-mono" value={s.background ?? ""} onChange={(e) => upd({ background: e.target.value })} placeholder="#FFF o gradient" />
          </div>
        </div>
        <div>
          <label className="text-xs text-ink/70">Color texto</label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={s.textColor ?? "#000000"} onChange={(e) => upd({ textColor: e.target.value })} className="w-10 h-9 rounded border border-ink/15" />
            <input className="input flex-1 text-xs font-mono" value={s.textColor ?? ""} onChange={(e) => upd({ textColor: e.target.value })} placeholder="#000" />
          </div>
        </div>
      </div>
      <ImageField label="Imagen de fondo del módulo" value={s.backgroundImage ?? ""} onChange={(v) => upd({ backgroundImage: v })} />
      <Field label="Overlay (ej. rgba(0,0,0,0.35))" value={s.backgroundOverlay ?? ""} onChange={(v) => upd({ backgroundOverlay: v })} placeholder="rgba(0,0,0,0.35)" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Padding (ej. 24px)" value={s.padding ?? ""} onChange={(v) => upd({ padding: v })} placeholder="24px o 40px 20px" />
        <Field label="Radio borde (ej. 16px)" value={s.borderRadius ?? ""} onChange={(v) => upd({ borderRadius: v })} placeholder="16px" />
      </div>
      <Field label="Borde (ej. 1px solid #eee)" value={s.border ?? ""} onChange={(v) => upd({ border: v })} placeholder="1px solid #eee" />
      {(s.background || s.backgroundImage) && (
        <button onClick={() => onChange(undefined)} className="text-xs text-red-500 hover:underline">
          Limpiar estilo del módulo
        </button>
      )}
    </div>
  );
}

function QuizEditor({
  questions = [],
  onChange,
}: {
  questions: { id: string; question: string; options: string[] }[];
  onChange: (questions: { id: string; question: string; options: string[] }[]) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-ink/70">Preguntas del quiz</label>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="p-3 bg-ink/5 rounded-lg space-y-2">
            <Field label="Pregunta" value={q.question} onChange={(v) => { const n = [...questions]; n[i] = { ...n[i], question: v }; onChange(n); }} />
            <div className="space-y-1">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    value={opt}
                    onChange={(e) => { const n = [...questions]; n[i] = { ...n[i], options: [...n[i].options] }; n[i].options[oi] = e.target.value; onChange(n); }}
                    placeholder={`Opción ${oi + 1}`}
                  />
                  <button
                    onClick={() => { const n = [...questions]; n[i] = { ...n[i], options: n[i].options.filter((_, j) => j !== oi) }; onChange(n); }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Eliminar opción"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => { const n = [...questions]; n[i] = { ...n[i], options: [...n[i].options, ""] }; onChange(n); }}
                className="btn-outline text-xs w-full"
              >
                + Añadir opción
              </button>
            </div>
            <button
              onClick={() => { const n = [...questions]; n.splice(i, 1); onChange(n); }}
              className="text-red-500 text-sm hover:underline"
            >
              Eliminar pregunta
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...questions, { id: crypto.randomUUID(), question: "", options: ["", ""] }])}
          className="btn-outline text-sm w-full"
        >
          + Añadir pregunta
        </button>
      </div>
    </div>
  );
}