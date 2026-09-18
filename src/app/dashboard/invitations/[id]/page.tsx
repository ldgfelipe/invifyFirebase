"use client";

// ============================================================================
// EDITOR SIMPLIFICADO - Edita título, color temático y slug de la invitación.
// (Fase 2: editor visual drag&drop tipo Elementor sobre builderConfig.)
// ============================================================================
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import type { Invitation } from "@/lib/types";
import { slugify } from "@/lib/slug";
import { invitationUrl } from "@/lib/seo";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#D4AF37");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "reserved">("idle");
  const [suggestedSlug, setSuggestedSlug] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const snap = await getDoc(doc(db, "invitations", id));
      if (!snap.exists()) return;
      const data = snap.data() as Invitation;
      // Ownership implícito: reglas Firestore solo permiten leer las propias.
      setInv(data);
      setTitle(data.title);
      setColor(data.themeColor);
      setSlug(data.slug);
    })();
  }, [user, id]);

  // Validación live de unicidad al terminar de escribir (debounce 500ms)
  useEffect(() => {
    if (!inv) return;
    const wanted = slugify(slug);
    if (!wanted) {
      setSlugStatus("invalid");
      setSuggestedSlug(null);
      return;
    }
    if (wanted === inv.slug) {
      setSlugStatus("available");
      setSuggestedSlug(null);
      return;
    }
    setSlugStatus("checking");
    setSuggestedSlug(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/slug/check?slug=${encodeURIComponent(slug)}&excludeId=${inv.id}`);
        const data = await res.json();
        if (!data.valid) {
          if (data.error === "Palabra reservada") {
            setSlugStatus("reserved");
          } else {
            setSlugStatus("invalid");
          }
          setSuggestedSlug(data.suggested ?? null);
        } else if (data.available) {
          setSlugStatus("available");
          setSuggestedSlug(null);
        } else {
          setSlugStatus("taken");
          setSuggestedSlug(data.suggested ?? null);
        }
      } catch {
        setSlugStatus("idle");
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug, inv]);

  async function save() {
    setSaving(true);
    setError(null);
    setMsg(null);
    const wanted = slugify(slug);
    if (!wanted) {
      setError("El slug no es válido.");
      setSaving(false);
      return;
    }
    if (slugStatus === "taken" || slugStatus === "reserved") {
      setError(`Ese enlace ya está en uso. Sugerencia: ${suggestedSlug ?? wanted + "-1"}`);
      setSaving(false);
      return;
    }
    // Verificación server-side final (evita race condition y respeta mayúsculas/acentos)
    if (wanted !== inv?.slug) {
      try {
        const res = await fetch(`/api/slug/check?slug=${encodeURIComponent(slug)}&excludeId=${inv?.id ?? ""}`);
        const data = await res.json();
        if (!data.available) {
          setError(data.error === "Palabra reservada" ? "Palabra reservada. Usa otra." : "Ese enlace ya está en uso.");
          if (data.suggested) setSuggestedSlug(data.suggested);
          setSlugStatus(data.error === "Palabra reservada" ? "reserved" : "taken");
          setSaving(false);
          return;
        }
      } catch {
        // Fallback a check cliente si falla API
        const q = query(collection(db, "invitations"), where("slug", "==", wanted));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setError("Ese enlace ya está en uso. Prueba otro.");
          setSaving(false);
          return;
        }
      }
    }
    if (!inv) return;
    await updateDoc(doc(db, "invitations", id), {
      title,
      themeColor: color,
      slug: wanted,
      "builderConfig.theme.primaryColor": color,
    });
    setMsg("Guardado correctamente.");
    setSaving(false);
  }

  if (!inv) return <p className="text-ink/60">Cargando…</p>;

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="text-sm text-ink/60 hover:text-gold-500">
        ← Volver a Mis invitaciones
      </Link>
      <h1 className="section-title mt-4">Personalizar invitación</h1>

      <div className="card p-6 mt-6 space-y-5">
        <div>
          <label className="text-sm text-ink/70">Título</label>
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-ink/70">Color temático</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 rounded border border-ink/15"
            />
            <span className="text-sm text-ink/60">{color}</span>
          </div>
        </div>

        <div>
          <label className="text-sm text-ink/70">URL personalizada</label>
          <div className="flex items-center mt-1">
            <span className="text-ink/50 text-sm px-3 py-3 bg-ink/5 rounded-l-xl">
              /i/
            </span>
            <input
              className={`input rounded-l-none ${slugStatus === "taken" || slugStatus === "reserved" || slugStatus === "invalid" ? "border-red-300 focus:ring-red-200" : slugStatus === "available" ? "border-green-300" : ""}`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => {
                // Dispara validación inmediata al salir del campo
                if (debounceRef.current) clearTimeout(debounceRef.current);
                const wanted = slugify(slug);
                if (wanted && inv && wanted !== inv.slug) {
                  setSlugStatus("checking");
                  fetch(`/api/slug/check?slug=${encodeURIComponent(slug)}&excludeId=${inv.id}`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (!data.valid) {
                        setSlugStatus(data.error === "Palabra reservada" ? "reserved" : "invalid");
                        setSuggestedSlug(data.suggested ?? null);
                      } else if (data.available) {
                        setSlugStatus("available");
                        setSuggestedSlug(null);
                      } else {
                        setSlugStatus("taken");
                        setSuggestedSlug(data.suggested ?? null);
                      }
                    })
                    .catch(() => setSlugStatus("idle"));
                }
              }}
              placeholder="mi-fiesta"
            />
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Vista previa: {invitationUrl(slugify(slug) || inv.slug)}
          </p>
          {slugStatus === "checking" && <p className="text-xs text-ink/40 mt-1">⏳ Verificando disponibilidad...</p>}
          {slugStatus === "available" && slugify(slug) !== inv.slug && <p className="text-xs text-green-600 mt-1">✅ Disponible</p>}
          {slugStatus === "taken" && (
            <p className="text-xs text-red-600 mt-1">
              ❌ Ya existe. Sugerencia: <button type="button" onClick={() => { if (suggestedSlug) setSlug(suggestedSlug); }} className="underline font-medium hover:text-red-700">{suggestedSlug}</button>
            </p>
          )}
          {slugStatus === "reserved" && (
            <p className="text-xs text-red-600 mt-1">
              🚫 Palabra reservada. Sugerencia: <button type="button" onClick={() => { if (suggestedSlug) setSlug(suggestedSlug); }} className="underline font-medium hover:text-red-700">{suggestedSlug}</button>
            </p>
          )}
          {slugStatus === "invalid" && <p className="text-xs text-red-600 mt-1">⚠️ Slug no válido. Usa letras, números y guiones.</p>}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {msg && <p className="text-gold-500 text-sm">{msg}</p>}

        <div className="flex gap-3">
          <button onClick={save} disabled={saving || slugStatus === "taken" || slugStatus === "reserved" || slugStatus === "checking"} className="btn-primary disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <Link href={`/i/${inv.slug}`} className="btn-outline">
            Ver invitación
          </Link>
        </div>
      </div>
    </div>
  );
}
