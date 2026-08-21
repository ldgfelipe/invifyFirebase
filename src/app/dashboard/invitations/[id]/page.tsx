"use client";

// ============================================================================
// EDITOR SIMPLIFICADO - Edita título, color temático y slug de la invitación.
// (Fase 2: editor visual drag&drop tipo Elementor sobre builderConfig.)
// ============================================================================
import { useEffect, useState } from "react";
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
    // Verifica unicidad del slug (excluyendo la propia invitación).
    if (wanted !== inv?.slug) {
      const q = query(collection(db, "invitations"), where("slug", "==", wanted));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError("Ese enlace ya está en uso. Prueba otro.");
        setSaving(false);
        return;
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
              className="input rounded-l-none"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Vista previa: {invitationUrl(slug || inv.slug)}
          </p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {msg && <p className="text-gold-500 text-sm">{msg}</p>}

        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="btn-primary">
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
