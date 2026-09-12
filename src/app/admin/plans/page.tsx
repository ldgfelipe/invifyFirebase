"use client";

// ============================================================================
// ADMIN / PLANES - CRUD de /plans (solo admin).
// Estos docs se muestran en /pricing y se usan en el checkout de Stripe.
// ============================================================================
import React, { useEffect, useState } from "react";
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
import { formatPrice } from "@/lib/currency";

export default function AdminPlans() {
  const { user } = useAuth();
  const [items, setItems] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [featuresText, setFeaturesText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [creatingPrice, setCreatingPrice] = useState<"test" | "live" | null>(null);

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
    setForm({ name: "", price: 0, currency: "mxn", stripePriceId: "", stripePriceIdTest: "", stripePriceIdLive: "", stripeProductId: "" });
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
      stripePriceIdTest: p.stripePriceIdTest,
      stripePriceIdLive: p.stripePriceIdLive,
      stripeProductId: p.stripeProductId,
    });
    setFeaturesText(p.features.join("\n"));
    setErr(null);
    setMsg(null);
  }

  async function save() {
    setErr(null);
    setMsg(null);
    // Validar que al menos haya un price ID (test o live)
    if (!form.name || (!form.stripePriceIdTest && !form.stripePriceIdLive && !form.stripePriceId)) {
      setErr("Nombre y al menos un Stripe Price ID (test o live) son obligatorios.");
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
      currency: form.currency ?? "mxn",
      features,
      stripePriceId: form.stripePriceId || form.stripePriceIdTest || form.stripePriceIdLive || "",
      stripePriceIdTest: form.stripePriceIdTest,
      stripePriceIdLive: form.stripePriceIdLive,
      stripeProductId: form.stripeProductId,
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

  async function createStripePrice(mode: "test" | "live") {
    if (!form.name || !form.price) {
      setErr("Nombre y precio son obligatorios para crear el price en Stripe.");
      return;
    }
    setCreatingPrice(mode);
    setErr(null);
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/admin/stripe-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planName: form.name,
          amount: Number(form.price),
          currency: form.currency ?? "mxn",
          interval: "month",
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creando price en Stripe");

      // Actualiza el campo correspondiente + productId
      setForm((prev) => ({
        ...prev,
        [mode === "test" ? "stripePriceIdTest" : "stripePriceIdLive"]: data.priceId,
        stripeProductId: data.productId,
      }));
      setMsg(`Price ${mode} creado: ${data.priceId} (product: ${data.productId})`);
    } catch (err: any) {
      setErr(err.message);
    } finally {
      setCreatingPrice(null);
    }
  }

  async function updateStripePrice(mode: "test" | "live") {
    const priceId = mode === "test" ? form.stripePriceIdTest : form.stripePriceIdLive;
    if (!priceId) {
      setErr(`No hay Price ID ${mode} para actualizar.`);
      return;
    }
    setCreatingPrice(mode);
    setErr(null);
    try {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/admin/stripe-prices/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          productId: form.stripeProductId, // opcional
          planName: form.name,
          amount: Number(form.price),
          currency: form.currency ?? "mxn",
          interval: "month",
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error actualizando price en Stripe");
      setMsg(`Price ${mode} actualizado (metadata). Nota: monto/moneda/intervalo no se pueden cambiar en price existente.`);
    } catch (err: any) {
      setErr(err.message);
    } finally {
      setCreatingPrice(null);
    }
  }

  async function deleteStripePrice(mode: "test" | "live") {
    const priceId = mode === "test" ? form.stripePriceIdTest : form.stripePriceIdLive;
    const productId = form.stripeProductId; // opcional
    if (!priceId) {
      setErr(`No hay Price ID ${mode} para eliminar.`);
      return;
    }
    if (!confirm(`¿Archivar Price ${mode} (${priceId})? Se desactivará en Stripe.`)) return;
    setCreatingPrice(mode);
    setErr(null);
    try {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/admin/stripe-prices/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId, productId, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error eliminando price en Stripe");
      // Limpia el campo en el formulario
      setForm((prev) => ({
        ...prev,
        [mode === "test" ? "stripePriceIdTest" : "stripePriceIdLive"]: "",
      }));
      setMsg(`Price ${mode} archivado en Stripe.`);
    } catch (err: any) {
      setErr(err.message);
    } finally {
      setCreatingPrice(null);
    }
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
                  {formatPrice(p.price, p.currency as "mxn" | "usd" | "eur")} · {p.features.length} features
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
              placeholder="mxn"
              value={form.currency ?? "mxn"}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>

          {/* Stripe Price IDs - Test / Live */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-ink/70 block mb-1">Stripe Price ID Test (price_xxx)</label>
              <div className="flex flex-wrap gap-2">
                <input
                  className="input flex-1 min-w-0"
                  placeholder="price_test_xxx"
                  value={form.stripePriceIdTest ?? ""}
                  onChange={(e) => setForm({ ...form, stripePriceIdTest: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => createStripePrice("test")}
                  disabled={creatingPrice === "test" || !form.name || !form.price}
                  className="btn-outline whitespace-nowrap"
                >
                  {creatingPrice === "test" ? "Creando…" : "Crear en Stripe Test"}
                </button>
                {form.stripePriceIdTest && (
                  <React.Fragment>
                    <button
                      type="button"
                      onClick={() => updateStripePrice("test")}
                      disabled={creatingPrice === "test"}
                      className="btn-outline whitespace-nowrap"
                    >
                      Actualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStripePrice("test")}
                      disabled={creatingPrice === "test"}
                      className="btn-outline whitespace-nowrap text-red-600 hover:bg-red-50 border-red-200"
                    >
                      Archivar
                    </button>
                  </React.Fragment>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm text-ink/70 block mb-1">Stripe Price ID Live (price_xxx)</label>
              <div className="flex flex-wrap gap-2">
                <input
                  className="input flex-1"
                  placeholder="price_live_xxx"
                  value={form.stripePriceIdLive ?? ""}
                  onChange={(e) => setForm({ ...form, stripePriceIdLive: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => createStripePrice("live")}
                  disabled={creatingPrice === "live" || !form.name || !form.price}
                  className="btn-primary whitespace-nowrap"
                >
                  {creatingPrice === "live" ? "Creando…" : "Crear en Stripe Live"}
                </button>
                {form.stripePriceIdLive && (
                  <React.Fragment>
                    <button
                      type="button"
                      onClick={() => updateStripePrice("live")}
                      disabled={creatingPrice === "live"}
                      className="btn-outline whitespace-nowrap"
                    >
                      Actualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStripePrice("live")}
                      disabled={creatingPrice === "live"}
                      className="btn-outline whitespace-nowrap text-red-600 hover:bg-red-50 border-red-200"
                    >
                      Archivar
                    </button>
                  </React.Fragment>
                )}
              </div>
            </div>
          </div>

          {/* Legacy single field (para compatibilidad) */}
          <input
            className="input"
            placeholder="Stripe Price ID (price_xxx) - Legacy"
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
