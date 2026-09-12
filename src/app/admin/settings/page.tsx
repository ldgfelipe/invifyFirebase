"use client";

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
    stripeTestMode: true,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "stripe" | "paypal" | "mercadopago">("general");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "site", "config"));
      if (snap.exists()) {
        const data = snap.data() as SiteSettings;
        setForm(prev => ({ ...prev, ...data }));
      }
    })();
  }, [user]);

  async function save() {
    setErr(null);
    setMsg(null);
    setSaving(true);
    if (!form.heroTitle || !form.heroCta) {
      setErr("Título y CTA son obligatorios.");
      setSaving(false);
      return;
    }
    try {
      const changedSections: string[] = [];
      if (activeTab === "general") changedSections.push("landing", "modo_stripe");
      if (activeTab === "stripe") changedSections.push("stripe_keys");
      if (activeTab === "paypal") changedSections.push("paypal_keys");
      if (activeTab === "mercadopago") changedSections.push("mercadopago_keys");

      await setDoc(doc(db, "site", "config"), form);

      // Log cliente
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settings.updated",
          userId: user?.uid,
          userEmail: user?.email,
          userRole: "admin",
          targetId: "site/config",
          targetType: "settings",
          metadata: { sections: changedSections, activeTab },
          description: `Admin actualizó configuración: ${changedSections.join(", ")}`,
          severity: "info",
        }),
      });

      setMsg("Configuración guardada. Los cambios aplican en nuevos pagos/webhooks.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="section-title">Configuración</h1>
      <p className="text-ink/60 mb-6">
        Configura el sitio, SEO, medios de pago y modo de operación.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-ink/10">
        {["general", "stripe", "paypal", "mercadopago"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === tab
                ? "bg-white text-gold-500 border-b-2 border-gold-500"
                : "text-ink/50 hover:text-ink/70"
            }`}
          >
            {tab === "general" && "🌐 General"}
            {tab === "stripe" && "💳 Stripe"}
            {tab === "paypal" && "🅿️ PayPal"}
            {tab === "mercadopago" && "💚 Mercado Pago"}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-6">
        {activeTab === "general" && (
          <>
            <section>
              <h2 className="font-serif text-lg text-ink mb-4 border-b border-ink/10 pb-2">Landing principal</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Título del hero</label>
                  <input
                    className="input"
                    value={form.heroTitle}
                    onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Subtítulo</label>
                  <textarea
                    className="input"
                    value={form.heroSubtitle}
                    onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Texto del botón (CTA)</label>
                  <input
                    className="input"
                    value={form.heroCta}
                    onChange={(e) => setForm({ ...form, heroCta: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Imagen del hero (URL)</label>
                  <input
                    className="input"
                    value={form.heroImage ?? ""}
                    onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Meta descripción (SEO)</label>
                  <textarea
                    className="input"
                    value={form.metaDescription}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-lg text-ink mb-4 border-b border-ink/10 pb-2">Modo de operación Stripe</h2>
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.stripeTestMode}
                    onChange={(e) => setForm({ ...form, stripeTestMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-ink/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink/20 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gold-500"></div>
                </label>
                <div>
                  <p className="font-medium text-ink">
                    {form.stripeTestMode ? "🧪 Modo PRUEBA (test)" : "🚀 Modo PRODUCCIÓN (live)"}
                  </p>
                  <p className="text-sm text-ink/60">
                    {form.stripeTestMode
                      ? "Usa claves de prueba (test). No se cobra dinero real."
                      : "Usa claves de producción (live). Procesa pagos reales."}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "stripe" && (
          <>
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800 mb-2">🧪 Stripe TEST</h3>
              <p className="text-sm text-blue-700 mb-4">Claves de prueba (pk_test_, sk_test_). No se cobra dinero real.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Publishable Key (pk_test_...)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={form.stripeTestPublishableKey ?? ""}
                    onChange={(e) => setForm({ ...form, stripeTestPublishableKey: e.target.value })}
                    placeholder="pk_test_..."
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Secret Key (sk_test_...)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.stripeTestSecretKey ?? ""}
                    onChange={(e) => setForm({ ...form, stripeTestSecretKey: e.target.value })}
                    placeholder="sk_test_..."
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Webhook Secret (whsec_...)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.stripeTestWebhookSecret ?? ""}
                    onChange={(e) => setForm({ ...form, stripeTestWebhookSecret: e.target.value })}
                    placeholder="whsec_test_..."
                    autoComplete="off"
                  />
                </div>
              </div>
            </section>

            <section className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">🚀 Stripe PRODUCCIÓN (LIVE)</h3>
              <p className="text-sm text-green-700 mb-4">Claves de producción (pk_live_, sk_live_). Procesa pagos reales.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Publishable Key (pk_live_...)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={form.stripeLivePublishableKey ?? ""}
                    onChange={(e) => setForm({ ...form, stripeLivePublishableKey: e.target.value })}
                    placeholder="pk_live_..."
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Secret Key (sk_live_...)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.stripeLiveSecretKey ?? ""}
                    onChange={(e) => setForm({ ...form, stripeLiveSecretKey: e.target.value })}
                    placeholder="sk_live_..."
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Webhook Secret (whsec_...)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.stripeLiveWebhookSecret ?? ""}
                    onChange={(e) => setForm({ ...form, stripeLiveWebhookSecret: e.target.value })}
                    placeholder="whsec_live_..."
                    autoComplete="off"
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "paypal" && (
          <>
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800 mb-2">🧪 PayPal TEST (Sandbox)</h3>
              <p className="text-sm text-blue-700 mb-4">Credenciales de sandbox. No se cobra dinero real.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Client ID (Sandbox)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={form.paypalTestClientId ?? ""}
                    onChange={(e) => setForm({ ...form, paypalTestClientId: e.target.value })}
                    placeholder="AaBbCc... (sandbox)"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Secret (Sandbox)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.paypalTestSecret ?? ""}
                    onChange={(e) => setForm({ ...form, paypalTestSecret: e.target.value })}
                    placeholder="secret_sandbox..."
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Webhook ID (Sandbox)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={form.paypalTestWebhookId ?? ""}
                    onChange={(e) => setForm({ ...form, paypalTestWebhookId: e.target.value })}
                    placeholder="wh_..."
                  />
                </div>
              </div>
            </section>

            <section className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">🚀 PayPal LIVE</h3>
              <p className="text-sm text-green-700 mb-4">Credenciales de producción. Procesa pagos reales.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Client ID (Live)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={form.paypalLiveClientId ?? ""}
                    onChange={(e) => setForm({ ...form, paypalLiveClientId: e.target.value })}
                    placeholder="AaBbCc... (live)"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Secret (Live)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.paypalLiveSecret ?? ""}
                    onChange={(e) => setForm({ ...form, paypalLiveSecret: e.target.value })}
                    placeholder="secret_live..."
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Webhook ID (Live)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={form.paypalLiveWebhookId ?? ""}
                    onChange={(e) => setForm({ ...form, paypalLiveWebhookId: e.target.value })}
                    placeholder="wh_..."
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "mercadopago" && (
          <>
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800 mb-2">🧪 Mercado Pago TEST</h3>
              <p className="text-sm text-blue-700 mb-4">Credenciales de prueba. Usa tarjetas de prueba de MP.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Access Token (Test)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.mercadopagoTestAccessToken ?? ""}
                    onChange={(e) => setForm({ ...form, mercadopagoTestAccessToken: e.target.value })}
                    placeholder="TEST-..."
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Public Key (Test)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={form.mercadopagoTestPublicKey ?? ""}
                    onChange={(e) => setForm({ ...form, mercadopagoTestPublicKey: e.target.value })}
                    placeholder="TEST-..."
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Webhook Secret (Test)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.mercadopagoTestWebhookSecret ?? ""}
                    onChange={(e) => setForm({ ...form, mercadopagoTestWebhookSecret: e.target.value })}
                    placeholder="whsec_test_..."
                    autoComplete="off"
                  />
                </div>
              </div>
            </section>

            <section className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">🚀 Mercado Pago LIVE</h3>
              <p className="text-sm text-green-700 mb-4">Credenciales de producción. Procesa pagos reales.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Access Token (Live)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.mercadopagoLiveAccessToken ?? ""}
                    onChange={(e) => setForm({ ...form, mercadopagoLiveAccessToken: e.target.value })}
                    placeholder="APP_USR-..."
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Public Key (Live)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={form.mercadopagoLivePublicKey ?? ""}
                    onChange={(e) => setForm({ ...form, mercadopagoLivePublicKey: e.target.value })}
                    placeholder="APP_USR-..."
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Webhook Secret (Live)</label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    value={form.mercadopagoLiveWebhookSecret ?? ""}
                    onChange={(e) => setForm({ ...form, mercadopagoLiveWebhookSecret: e.target.value })}
                    placeholder="whsec_live_..."
                    autoComplete="off"
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {err && <p className="text-red-600 text-sm mt-4">{err}</p>}
      {msg && <p className="text-green-600 text-sm mt-4">{msg}</p>}
      <button onClick={save} disabled={saving} className="btn-primary w-full sm:w-auto mt-4">
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}