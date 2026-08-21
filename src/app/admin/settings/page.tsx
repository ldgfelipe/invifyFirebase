"use client";

// ============================================================================
// ADMIN / SITIO - Edita /site/config (hero y SEO de la landing principal).
// Solo admin (reglas Firestore). La home lee estos valores en SSR.
// ============================================================================
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { SiteSettings } from "@/lib/types";

export default function AdminSiteSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState<SiteSettings>({
    heroTitle: "",
    heroSubtitle: "",
    heroCta: "",
    heroImage: "",
    metaDescription: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "site", "config"));
      if (snap.exists()) setForm(snap.data() as SiteSettings);
    })();
  }, [user]);

  async function save() {
    setErr(null);
    setMsg(null);
    if (!form.heroTitle || !form.heroCta) {
      setErr("Título y CTA son obligatorios.");
      return;
    }
    await setDoc(doc(db, "site", "config"), form);
    setMsg("Configuración del sitio guardada.");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="section-title">Sitio / Landing principal</h1>
      <p className="text-ink/60 mb-6">
        Edita el hero y el SEO de la home. Se refleja al instante en la landing pública.
      </p>

      <div className="card p-6 space-y-4">
        <div>
          <label className="text-sm text-ink/70">Título del hero</label>
          <input
            className="input mt-1"
            value={form.heroTitle}
            onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-ink/70">Subtítulo</label>
          <textarea
            className="input mt-1"
            value={form.heroSubtitle}
            onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-ink/70">Texto del botón (CTA)</label>
          <input
            className="input mt-1"
            value={form.heroCta}
            onChange={(e) => setForm({ ...form, heroCta: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-ink/70">Imagen del hero (URL)</label>
          <input
            className="input mt-1"
            value={form.heroImage ?? ""}
            onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-ink/70">Meta descripción (SEO)</label>
          <textarea
            className="input mt-1"
            value={form.metaDescription}
            onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
          />
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        {msg && <p className="text-gold-500 text-sm">{msg}</p>}
        <button onClick={save} className="btn-primary">
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
