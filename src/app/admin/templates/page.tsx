"use client";

// ============================================================================
// ADMIN / PLANTILLAS - CRUD de /templates (solo admin).
// Permite crear/editar el catálogo y el builderConfig que se renderiza en las
// landing pages públicas (/templates, /templates/[category], /i/[slug]).
// ============================================================================
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import type { Template, TemplateCategory } from "@/lib/types";

const CATEGORIES: TemplateCategory[] = [
  "boda",
  "cumpleanos",
  "babyshower",
  "bautizo",
  "corporativo",
];

// BuilderConfig de ejemplo para arrancar una plantilla nueva.
const SAMPLE_CONFIG = JSON.stringify(
  {
    modules: [
      { id: "pre", type: "preloader", visible: true, text: "Cargando invitación…" },
      {
        id: "hdr",
        type: "header",
        visible: true,
        title: "¡Estás invitado!",
        subtitle: "Acompáñanos",
        names: "Ana & Luis",
        date: "12 de Diciembre, 2026",
        imageUrl: "",
      },
      { id: "cd", type: "countdown", visible: true, targetDate: "2026-12-12T18:00:00", label: "Faltan" },
      { id: "rsvp", type: "rsvp", visible: true, title: "Confirmar asistencia", collectEmail: true },
    ],
    theme: { primaryColor: "#D4AF37", background: "#FAF6EF", fontFamily: "serif" },
  },
  null,
  2
);

export default function AdminTemplates() {
  const { user } = useAuth();
  const [items, setItems] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<Partial<Template>>({});
  const [configText, setConfigText] = useState(SAMPLE_CONFIG);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const snap = await getDocs(query(collection(db, "templates"), orderBy("createdAt", "desc")));
    setItems(snap.docs.map((d) => d.data() as Template));
  }
  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function startNew() {
    setEditing(null);
    setForm({ name: "", category: "boda", thumbnailUrl: "", previewUrl: "", active: true });
    setConfigText(SAMPLE_CONFIG);
    setErr(null);
    setMsg(null);
  }

  function startEdit(t: Template) {
    setEditing(t);
    setForm({
      id: t.id,
      name: t.name,
      category: t.category,
      thumbnailUrl: t.thumbnailUrl,
      previewUrl: t.previewUrl,
      active: t.active,
    });
    setConfigText(JSON.stringify(t.builderConfig, null, 2));
    setErr(null);
    setMsg(null);
  }

  async function save() {
    setErr(null);
    setMsg(null);
    let builderConfig: any;
    try {
      builderConfig = JSON.parse(configText);
    } catch {
      setErr("El builderConfig no es JSON válido.");
      return;
    }
    if (!form.name || !form.category) {
      setErr("Nombre y categoría son obligatorios.");
      return;
    }
    const id = editing?.id ?? doc(collection(db, "templates")).id;
    const data: any = {
      id,
      name: form.name!,
      category: form.category!,
      thumbnailUrl: form.thumbnailUrl ?? "",
      previewUrl: form.previewUrl ?? "",
      active: form.active ?? true,
      builderConfig,
      createdAt: editing?.id ? editing.createdAt : Date.now(),
    };
    await setDoc(doc(db, "templates", id), data);
    setMsg("Plantilla guardada.");
    await load();
    startNew();
  }

  async function remove(t: Template) {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return;
    await deleteDoc(doc(db, "templates", t.id));
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Plantillas</h1>
        <button onClick={startNew} className="btn-primary">
          Nueva plantilla
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lista */}
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-serif text-lg text-ink">{t.name}</p>
                <p className="text-xs text-ink/50 capitalize">
                  {t.category} · {t.active ? "Activa" : "Inactiva"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(t)} className="btn-outline text-sm px-3 py-1">
                  Editar
                </button>
                <button onClick={() => remove(t)} className="btn-outline text-sm px-3 py-1 text-red-600">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-ink/50 text-sm">Aún no hay plantillas.</p>
          )}
        </div>

        {/* Formulario */}
        <div className="card p-6 space-y-4">
          <h2 className="font-serif text-xl text-ink">
            {editing ? "Editar plantilla" : "Nueva plantilla"}
          </h2>
          <input
            className="input"
            placeholder="Nombre"
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="input"
            value={form.category ?? "boda"}
            onChange={(e) => setForm({ ...form, category: e.target.value as TemplateCategory })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="thumbnailUrl (https://...)"
            value={form.thumbnailUrl ?? ""}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
          />
          <input
            className="input"
            placeholder="previewUrl (https://...)"
            value={form.previewUrl ?? ""}
            onChange={(e) => setForm({ ...form, previewUrl: e.target.value })}
          />
          <p className="text-[11px] text-ink/45 bg-ink/5 rounded-lg px-3 py-2 -mt-1">
            💡 Aloja gratis en{" "}
            <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">imgbb.com</a>,{" "}
            <a href="https://postimages.org" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">postimages.org</a>,{" "}
            <a href="https://catbox.moe" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">catbox.moe</a> o{" "}
            <a href="https://imgur.com/upload" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">imgur.com</a> y pega la URL directa.
          </p>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={form.active ?? true}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activa (visible en el catálogo)
          </label>
          <div>
            <label className="text-sm text-ink/70">builderConfig (JSON)</label>
            <textarea
              className="input mt-1 font-mono text-xs h-56"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
            />
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          {msg && <p className="text-gold-500 text-sm">{msg}</p>}
          <div className="flex gap-3">
            <button onClick={save} className="btn-primary">
              Guardar
            </button>
            {editing && (
              <button onClick={startNew} className="btn-outline">
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
