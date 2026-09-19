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
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<TemplateCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "category">("recent");

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

  // --- Filtros y búsqueda ---
  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c] = items.filter((t) => t.category === c).length;
    return acc;
  }, {} as Record<string, number>);
  const filtered = items
    .filter((t) => {
      if (filterCat !== "all" && t.category !== filterCat) return false;
      if (filterStatus === "active" && !t.active) return false;
      if (filterStatus === "inactive" && t.active) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

  function catColor(cat: string) {
    const map: Record<string, string> = { boda: "bg-pink-100 text-pink-700", cumpleanos: "bg-amber-100 text-amber-700", babyshower: "bg-sky-100 text-sky-700", bautizo: "bg-violet-100 text-violet-700", corporativo: "bg-slate-100 text-slate-700" };
    return map[cat] ?? "bg-ink/10 text-ink/60";
  }
  function catLabel(cat: string) {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="section-title">Plantillas</h1>
          <p className="text-sm text-ink/50">{items.length} totales · {filtered.length} filtradas · {CATEGORIES.map((c) => `${catLabel(c)}:${counts[c] ?? 0}`).join(" · ")}</p>
        </div>
        <button onClick={startNew} className="btn-primary">
          Nueva plantilla
        </button>
      </div>

      {/* Barra búsqueda y filtros */}
      <div className="card p-4 mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30">🔍</span>
            <input className="input pl-9" placeholder="Buscar por nombre o id..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input lg:w-48" value={filterCat} onChange={(e) => setFilterCat(e.target.value as any)}>
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {catLabel(c)} ({counts[c] ?? 0})
              </option>
            ))}
          </select>
          <select className="input lg:w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">Todas</option>
            <option value="active">Solo activas</option>
            <option value="inactive">Inactivas</option>
          </select>
          <select className="input lg:w-36" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="recent">Recientes</option>
            <option value="name">Nombre A-Z</option>
            <option value="category">Categoría</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCat("all")} className={`text-xs px-3 py-1 rounded-full border ${filterCat === "all" ? "bg-ink text-white border-ink" : "bg-white border-ink/10"}`}>
            Todas ({items.length})
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)} className={`text-xs px-3 py-1 rounded-full border capitalize ${filterCat === c ? "bg-gold-500 text-white border-gold-500" : "bg-white border-ink/10"}`}>
              {catLabel(c)} ({counts[c] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lista */}
        <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
          {filtered.map((t) => (
            <div key={t.id} className={`card p-3 flex gap-3 hover:shadow-md transition ${editing?.id === t.id ? "ring-2 ring-gold-300" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.thumbnailUrl} alt={t.name} className="w-20 h-20 rounded-lg object-cover border border-ink/10 shrink-0" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-sm text-ink leading-tight truncate pr-2">{t.name}</p>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${t.active ? "bg-green-100 text-green-700" : "bg-ink/10 text-ink/50"}`}>{t.active ? "Activa" : "Inactiva"}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${catColor(t.category)}`}>{t.category}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink/5 text-ink/50">{t.builderConfig?.modules?.length ?? 0} secciones</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink/5 text-ink/50" title={t.id}>
                    {t.id.slice(0, 12)}…
                  </span>
                </div>
                <p className="text-[11px] text-ink/40 mt-1 truncate">
                  {(t.builderConfig?.modules ?? []).map((m: any) => m.type).join(" · ") || "Sin módulos"}
                </p>
                <p className="text-[11px] text-ink/40">{t.builderConfig?.theme?.fontFamily === "serif" ? "Serif elegante" : "Sans moderno"} · {t.builderConfig?.theme?.primaryColor}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => startEdit(t)} className="btn-outline text-xs px-2 py-1">
                  Editar
                </button>
                <a href={`/templates/demo/${t.id}`} target="_blank" className="btn-outline text-xs px-2 py-1 text-center">
                  Ver
                </a>
                <button onClick={() => remove(t)} className="btn-outline text-xs px-2 py-1 text-red-600">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-ink/50 text-sm py-8 text-center">Sin resultados para los filtros. <button onClick={() => { setSearch(""); setFilterCat("all"); setFilterStatus("all"); }} className="text-gold-500 underline">Limpiar</button></p>
          )}
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
