"use client";

// ============================================================================
// ADMIN / PLANES - CRUD de /plans (solo admin).
// Estos docs se muestran en /pricing y se usan en el checkout de Stripe.
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
import type { Plan } from "@/lib/types";

export default function AdminPlans() {
  const { user } = useAuth();
  const [items, setItems] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [featuresText, setFeaturesText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const snap = await getDocs(query(collection(db, "plans"), orderBy("price", "asc")));
    setItems(snap.docs.map((d) => d.data() as Plan));
  }
  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function startNew() {
    setEditing(null);
    setForm({ name: "", price: 0, currency: "usd", stripePriceId: "" });
    setFeaturesText("");
    setErr(null);
    setMsg(null);
  }
  function startEdit(p: Plan) {
    setEditing(p);
    setForm({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      stripePriceId: p.stripePriceId,
    });
    setFeaturesText(p.features.join("\n"));
    setErr(null);
    setMsg(null);
  }

  async function save() {
    setErr(null);
    setMsg(null);
    if (!form.name || !form.stripePriceId) {
      setErr("Nombre y Stripe Price ID son obligatorios.");
      return;
    }
    const features = featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    const id = editing?.id ?? doc(collection(db, "plans")).id;
    const data: Plan = {
      id,
      name: form.name!,
      price: Number(form.price ?? 0),
      currency: form.currency ?? "usd",
      features,
      stripePriceId: form.stripePriceId!,
    };
    await setDoc(doc(db, "plans", id), data);
    setMsg("Plan guardado.");
    await load();
    startNew();
  }

  async function remove(p: Plan) {
    if (!confirm(`¿Eliminar el plan "${p.name}"?`)) return;
    await deleteDoc(doc(db, "plans", p.id));
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Planes</h1>
        <button onClick={startNew} className="btn-primary">
          Nuevo plan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-serif text-lg text-ink">{p.name}</p>
                <p className="text-xs text-ink/50">
                  ${(p.price / 100).toFixed(2)} · {p.features.length} features
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(p)} className="btn-outline text-sm px-3 py-1">
                  Editar
                </button>
                <button onClick={() => remove(p)} className="btn-outline text-sm px-3 py-1 text-red-600">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-ink/50 text-sm">Aún no hay planes.</p>}
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-serif text-xl text-ink">
            {editing ? "Editar plan" : "Nuevo plan"}
          </h2>
          <input
            className="input"
            placeholder="Nombre (ej. Premium)"
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="flex gap-3">
            <input
              className="input"
              type="number"
              placeholder="Precio en centavos"
              value={form.price ?? 0}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
            <input
              className="input w-28"
              placeholder="usd"
              value={form.currency ?? "usd"}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <input
            className="input"
            placeholder="Stripe Price ID (price_xxx)"
            value={form.stripePriceId ?? ""}
            onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })}
          />
          <div>
            <label className="text-sm text-ink/70">Features (una por línea)</label>
            <textarea
              className="input mt-1 h-32"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
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
