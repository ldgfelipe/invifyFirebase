"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n/provider";
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
import { cn } from "@/lib/cn";

const INTERVALS: Array<"one_time" | "day" | "week" | "month" | "year"> = [
  "one_time",
  "day",
  "week",
  "month",
  "year",
];

export default function AdminPlans() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const [items, setItems] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [featuresText, setFeaturesText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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
    setForm({
      name: "",
      name_en: "",
      price: 0,
      price_usd: 0,
      price_idr: 0,
      currency: "mxn",
      interval: "one_time",
      features: [],
      stripePriceId: "",
      stripePriceIdTest: "",
      stripePriceIdLive: "",
    });
    setFeaturesText("");
    setErr(null);
    setMsg(null);
  }
  function startEdit(p: Plan) {
    setEditing(p);
    setForm({ ...p, name_en: p.name_en ?? "", price_usd: p.price_usd ?? 0, price_idr: p.price_idr ?? 0 });
    setFeaturesText((p.features ?? []).join("\n"));
    setErr(null);
    setMsg(null);
  }

  function buildPlanId(): string {
    return editing?.id ?? doc(collection(db, "plans")).id;
  }

  function parseFeatures(): string[] {
    return featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  }

  async function saveOnly() {
    setErr(null);
    setMsg(null);
    if (!form.name) {
      setErr("El nombre es obligatorio.");
      return;
    }
    const id = buildPlanId();
    const data: Plan = {
      id,
      name: form.name!,
      name_en: form.name_en ?? "",
      price: Number(form.price ?? 0),
      price_usd: Number(form.price_usd ?? 0),
      price_idr: Number(form.price_idr ?? 0),
      currency: form.currency ?? "mxn",
      interval: form.interval ?? "one_time",
      features: parseFeatures(),
      stripePriceId: form.stripePriceId || form.stripePriceIdTest || form.stripePriceIdLive || "",
      stripePriceIdTest: form.stripePriceIdTest ?? "",
      stripePriceIdLive: form.stripePriceIdLive ?? "",
      stripeProductId: form.stripeProductId ?? "",
      stripeProductIdTest: form.stripeProductIdTest ?? "",
      stripeProductIdLive: form.stripeProductIdLive ?? "",
    };
    await setDoc(doc(db, "plans", id), data);
    setMsg("Plan guardado.");
    await load();
  }

  async function saveAndSync() {
    setErr(null);
    setMsg(null);
    if (!form.name || !form.price) {
      setErr("Nombre y precio son obligatorios para sincronizar con Stripe.");
      return;
    }
    setSyncing(true);
    try {
      const id = buildPlanId();
      const token = await user!.getIdToken();

      // 1. Guardar plan local (sin borrar price IDs ya existentes).
      const data: Plan = {
        id,
        name: form.name!,
        name_en: form.name_en ?? "",
        price: Number(form.price ?? 0),
        price_usd: Number(form.price_usd ?? 0),
        price_idr: Number(form.price_idr ?? 0),
        currency: form.currency ?? "mxn",
        interval: form.interval ?? "one_time",
        features: parseFeatures(),
        stripePriceId: form.stripePriceId || form.stripePriceIdTest || form.stripePriceIdLive || "",
        stripePriceIdTest: form.stripePriceIdTest ?? "",
        stripePriceIdLive: form.stripePriceIdLive ?? "",
        stripeProductId: form.stripeProductId ?? "",
        stripeProductIdTest: form.stripeProductIdTest ?? "",
        stripeProductIdLive: form.stripeProductIdLive ?? "",
      };

      // 2. Sincronizar con Stripe (test/live según claves configuradas).
      const res = await fetch("/api/admin/stripe-prices/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: id,
          name: form.name,
          amount: Number(form.price),
          price: Number(form.price),
          currency: form.currency ?? "mxn",
          interval: form.interval ?? "one_time",
          features: data.features,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Error sincronizando con Stripe");

      const syncedModes = result.modes?.length
        ? result.modes.map((m: string) => (m === "test" ? "Test" : "Live")).join(" y ")
        : "ninguno";
      const details = result.syncResults
        ? Object.entries(result.syncResults)
            .map(([m, v]: [string, any]) => `${m}: ${v.created ? "creado" : "ya existente"} (${v.priceId})`)
            .join(" · ")
        : "";
      setMsg(`Plan sincronizado con Stripe (${syncedModes}). ${details}${result.note ? " " + result.note : ""}`);

      await load();
      setEditing(null);
    } catch (err: any) {
      setErr(err.message);
    } finally {
      setSyncing(false);
    }
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
        {/* Lista con estado de sincronización */}
        <div className="space-y-3">
          {items.map((p) => {
            const hasTest = Boolean(p.stripePriceIdTest);
            const hasLive = Boolean(p.stripePriceIdLive);
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg text-ink">{p.name}</p>
                    <p className="text-xs text-ink/50">
                      {locale === "en" && p.name_en ? p.name_en : p.name} ·{ formatPrice(p.price, (p.currency as "mxn" | "usd" | "eur") || "mxn") } ·{" "}
                      {p.interval === "one_time" || !p.interval
                        ? "pago único"
                        : p.interval === "year"
                          ? "anual"
                          : p.interval === "month"
                            ? "mensual"
                            : p.interval === "week"
                              ? "semanal"
                              : "diario"} ·{" "}
                      {p.features?.length ?? 0} features
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(p)} className="btn-outline text-sm px-3 py-1">
                      Editar
                    </button>
                    <button onClick={() => remove(p)} className="btn-outline text-sm px-3 py-1 text-red-600">
                      Eliminar
                    </button>
                  </div>
                </div>
                {/* Estado Stripe */}
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={hasTest} />
                    <span className="text-ink/60">
                      Test: {hasTest ? <code>{p.stripePriceIdTest}</code> : "sin precio"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot ok={hasLive} />
                    <span className="text-ink/60">
                      Live: {hasLive ? <code>{p.stripePriceIdLive}</code> : "sin precio"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="text-ink/50 text-sm">Aún no hay planes.</p>}
        </div>

        {/* Formulario */}
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
              placeholder="Precio en centavos (ej. 49000)"
              value={form.price ?? 0}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
            <input
              className="input w-24"
              placeholder="mxn"
              value={form.currency ?? "mxn"}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
            <select
              className="input w-32"
              value={form.interval ?? "one_time"}
              onChange={(e) => setForm({ ...form, interval: e.target.value as Plan["interval"] })}
            >
              {INTERVALS.map((i) => (
                <option key={i} value={i}>
                  {i === "one_time"
                    ? "Pago único"
                    : i === "day"
                      ? "Diario"
                      : i === "week"
                        ? "Semanal"
                        : i === "month"
                          ? "Mensual"
                          : "Anual"}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-ink/50 -mt-2">
            El precio es en centavos (49000 = $490.00). <strong>Pago único</strong> no necesita
            productos/precios de Stripe: se cobra directo con Stripe, PayPal o Mercado Pago.
            Si eliges un intervalo recurrente (suscripción), usa «Guardar y sincronizar con Stripe» para crear el Price.
          </p>

          <p className="text-xs text-ink/70">Features (una por línea)</p>
          <textarea
            className="input mt-1 h-32"
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
          />

          {form.stripePriceIdTest || form.stripePriceIdLive ? (
            <div className="text-xs text-ink/50 bg-ink/5 rounded-lg p-3 space-y-1">
              {form.stripePriceIdTest && (
                <p><span className="text-ink/60">Test:</span> <code>{form.stripePriceIdTest}</code></p>
              )}
              {form.stripePriceIdLive && (
                <p><span className="text-ink/60">Live:</span> <code>{form.stripePriceIdLive}</code></p>
              )}
              <p className="italic">
                No edites los IDs a mano: usa «Guardar y sincronizar» y se generan solos.
              </p>
            </div>
          ) : null}

          {err && <p className="text-red-600 text-sm">{err}</p>}
          {msg && <p className="text-gold-500 text-sm break-all">{msg}</p>}

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={saveAndSync}
              disabled={syncing}
              className="btn-primary"
            >
              {syncing ? "Sincronizando con Stripe…" : "Guardar y sincronizar con Stripe"}
            </button>
            <button onClick={saveOnly} disabled={syncing} className="btn-outline">
              Guardar sin Stripe
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

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        ok ? "bg-green-500" : "bg-ink/20"
      )}
    />
  );
}