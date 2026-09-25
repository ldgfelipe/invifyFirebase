"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DEFAULT_BANNER, type SiteSettings } from "@/lib/types";

export default function AdminSiteSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState<SiteSettings>({
    heroTitle: "",
    heroTitle_en: "",
    heroSubtitle: "",
    heroSubtitle_en: "",
    heroCta: "",
    heroCta_en: "",
    heroImage: "",
    metaDescription: "",
    metaDescription_en: "",
    stripeTestMode: true,
    banner: { ...DEFAULT_BANNER },
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "banner" | "marketing" | "stripe" | "paypal" | "mercadopago">("general");

  const setBanner = (patch: Partial<NonNullable<SiteSettings["banner"]>>) =>
    setForm((prev) => ({ ...prev, banner: { ...DEFAULT_BANNER, ...(prev.banner ?? {}), ...patch } }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "site", "config"));
      if (snap.exists()) {
        const data = snap.data() as SiteSettings;
        setForm(prev => ({
          ...prev,
          ...data,
          banner: { ...DEFAULT_BANNER, ...(data.banner ?? {}) },
        }));
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
      if (activeTab === "banner") changedSections.push("banner");
      if (activeTab === "marketing") changedSections.push("marketing");
      if (activeTab === "stripe") changedSections.push("stripe_keys");
      if (activeTab === "paypal") changedSections.push("paypal_keys");
      if (activeTab === "mercadopago") changedSections.push("mercadopago_keys");

      await setDoc(doc(db, "site", "config"), form, { merge: true });

      // Compat: limpia localStorage obsoleto (PricingFlow ya usa API, no localStorage)
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("stripeTestMode");
          // Opcional: sincroniza por si hay tabs viejos abiertos
          localStorage.setItem("stripeTestMode", String(form.stripeTestMode));
        }
      } catch {}

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
        {["general", "banner", "marketing", "stripe", "paypal", "mercadopago"].map((tab) => (
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
            {tab === "banner" && "📣 Banner"}
            {tab === "marketing" && "📊 Marketing"}
            {tab === "stripe" && "💳 Stripe"}
            {tab === "paypal" && "🅿️ PayPal"}
            {tab === "mercadopago" && "💚 Mercado Pago"}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-6">
        {activeTab === "marketing" && (
          <>
            <section>
              <h2 className="font-serif text-lg text-ink mb-4 border-b border-ink/10 pb-2">
                Analítica y píxeles
              </h2>
              <p className="text-sm text-ink/60 mb-4">
                Se inyectan en todas las páginas. Si un campo queda vacío, el script no se carga.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Google Tag Manager ID</label>
                  <input
                    className="input"
                    value={form.gtmId ?? ""}
                    onChange={(e) => setForm({ ...form, gtmId: e.target.value })}
                    placeholder="GTM-XXXXXXX"
                  />
                  <p className="text-xs text-ink/50 mt-1">
                    Formato <code className="text-ink/70">GTM-</code> seguido de 4 a 10 letras o
                    números. Un ID con otro formato se ignora para no romper el sitio.
                  </p>
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Meta Pixel ID</label>
                  <input
                    className="input"
                    value={form.metaPixelId ?? ""}
                    onChange={(e) => setForm({ ...form, metaPixelId: e.target.value })}
                    placeholder="123456789012345"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-lg text-ink mb-4 border-b border-ink/10 pb-2">
                Scripts personalizados
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">HTML en &lt;head&gt;</label>
                  <textarea
                    className="input mt-1 h-32 font-mono text-xs"
                    value={form.customHeadScripts ?? ""}
                    onChange={(e) => setForm({ ...form, customHeadScripts: e.target.value })}
                    placeholder={'<link rel="preconnect" href="https://fonts.googleapis.com">'}
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">HTML antes de &lt;/body&gt;</label>
                  <textarea
                    className="input mt-1 h-32 font-mono text-xs"
                    value={form.customBodyScripts ?? ""}
                    onChange={(e) => setForm({ ...form, customBodyScripts: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-red-600/80 mt-3">
                Solo tú puedes escribir esto, pero el contenido se inyecta tal cual en cada
                página. No pegues claves de API ni tokens: quedaron visibles para cualquier
                visitante. Para credenciales usa las variables de entorno.
              </p>
            </section>
          </>
        )}

        {activeTab === "banner" && (
          <>
            <section>
              <h2 className="font-serif text-lg text-ink mb-4 border-b border-ink/10 pb-2">
                Banner promocional
              </h2>
              <p className="text-sm text-ink/60 mb-4">
                Bloque que aparece en el inicio y/o en planes. Cada campo tiene su versión en
                español y en inglés; si la versión en inglés queda vacía, se muestra la de español.
              </p>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.banner?.enabled ?? false}
                    onChange={(e) => setBanner({ enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-ink">Mostrar el banner</span>
                </label>

                <div>
                  <label className="text-sm text-ink/70 block mb-1">¿Dónde se muestra?</label>
                  <select
                    className="input"
                    value={form.banner?.pages ?? "both"}
                    onChange={(e) => setBanner({ pages: e.target.value as any })}
                  >
                    <option value="both">Inicio y planes</option>
                    <option value="home">Solo inicio</option>
                    <option value="pricing">Solo planes y precios</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-ink/70 block mb-1">Estilo</label>
                  <select
                    className="input"
                    value={form.banner?.variant ?? "gold"}
                    onChange={(e) => setBanner({ variant: e.target.value as any })}
                  >
                    <option value="gold">Dorado (champagne)</option>
                    <option value="dark">Oscuro</option>
                    <option value="light">Claro</option>
                    <option value="gradient">Degradado</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-4">
              <h2 className="font-serif text-lg text-ink mb-2">Contenido (ES)</h2>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Etiqueta</label>
                <input
                  className="input"
                  value={form.banner?.badge ?? ""}
                  onChange={(e) => setBanner({ badge: e.target.value })}
                  placeholder="Nuevo"
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Título</label>
                <input
                  className="input"
                  value={form.banner?.title ?? ""}
                  onChange={(e) => setBanner({ title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Texto</label>
                <textarea
                  className="input"
                  value={form.banner?.text ?? ""}
                  onChange={(e) => setBanner({ text: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Botón (CTA)</label>
                <input
                  className="input"
                  value={form.banner?.cta ?? ""}
                  onChange={(e) => setBanner({ cta: e.target.value })}
                />
              </div>
            </section>

            <section className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-4">
              <h2 className="font-serif text-lg text-ink mb-2">Contenido (EN) 🇺🇸</h2>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Badge (EN)</label>
                <input
                  className="input"
                  value={form.banner?.badge_en ?? ""}
                  onChange={(e) => setBanner({ badge_en: e.target.value })}
                  placeholder="New"
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Title (EN)</label>
                <input
                  className="input"
                  value={form.banner?.title_en ?? ""}
                  onChange={(e) => setBanner({ title_en: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Text (EN)</label>
                <textarea
                  className="input"
                  value={form.banner?.text_en ?? ""}
                  onChange={(e) => setBanner({ text_en: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">CTA Button (EN)</label>
                <input
                  className="input"
                  value={form.banner?.cta_en ?? ""}
                  onChange={(e) => setBanner({ cta_en: e.target.value })}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-lg text-ink mb-2">Enlace e imagen</h2>
              <div>
                <label className="text-sm text-ink/70 block mb-1">URL del botón</label>
                <input
                  className="input"
                  value={form.banner?.link ?? ""}
                  onChange={(e) => setBanner({ link: e.target.value })}
                  placeholder="/templates"
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Imagen (URL) - opcional</label>
                <input
                  className="input"
                  value={form.banner?.image ?? ""}
                  onChange={(e) => setBanner({ image: e.target.value })}
                  placeholder="https://… o /api/thumb/lock/3"
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Imagen (EN) - opcional</label>
                <input
                  className="input"
                  value={form.banner?.image_en ?? ""}
                  onChange={(e) => setBanner({ image_en: e.target.value })}
                />
              </div>
            </section>

            <section className="border-t border-ink/10 pt-4">
              <h2 className="text-sm text-ink/70 mb-3">Vista previa</h2>
              <div className="space-y-2">
                <p className="text-xs text-ink/50">Español</p>
                <BannerPreview
                  title={form.banner?.title}
                  text={form.banner?.text}
                  cta={form.banner?.cta}
                  badge={form.banner?.badge}
                  image={form.banner?.image}
                  variant={form.banner?.variant}
                />
                <p className="text-xs text-ink/50 pt-2">English</p>
                <BannerPreview
                  title={form.banner?.title_en || form.banner?.title}
                  text={form.banner?.text_en || form.banner?.text}
                  cta={form.banner?.cta_en || form.banner?.cta}
                  badge={form.banner?.badge_en || form.banner?.badge}
                  image={form.banner?.image_en || form.banner?.image}
                  variant={form.banner?.variant}
                />
              </div>
            </section>
          </>
        )}

        {activeTab === "general" && (
          <>
            <section>
              <h2 className="font-serif text-lg text-ink mb-4 border-b border-ink/10 pb-2">Landing principal (ES)</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Título del hero (ES)</label>
                  <input
                    className="input"
                    value={form.heroTitle}
                    onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                    placeholder="Invitaciones que se sienten como el evento"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Subtítulo (ES)</label>
                  <textarea
                    className="input"
                    value={form.heroSubtitle}
                    onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Texto del botón (CTA) (ES)</label>
                  <input
                    className="input"
                    value={form.heroCta}
                    onChange={(e) => setForm({ ...form, heroCta: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Meta descripción (SEO) (ES)</label>
                  <textarea
                    className="input"
                    value={form.metaDescription}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
              <h2 className="font-serif text-lg text-ink mb-4 border-b border-blue-100 pb-2">Landing principal (EN) 🇺🇸</h2>
              <p className="text-xs text-ink/50 mb-3">Se muestra cuando el usuario elige English con el switch ES/EN. Si lo dejas vacío, se usa la versión en español.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Hero Title (EN)</label>
                  <input
                    className="input"
                    value={form.heroTitle_en ?? ""}
                    onChange={(e) => setForm({ ...form, heroTitle_en: e.target.value })}
                    placeholder="Invitations that feel like the event"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Hero Subtitle (EN)</label>
                  <textarea
                    className="input"
                    value={form.heroSubtitle_en ?? ""}
                    onChange={(e) => setForm({ ...form, heroSubtitle_en: e.target.value })}
                    placeholder="Editorial design, intentional typography..."
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">CTA Button (EN)</label>
                  <input
                    className="input"
                    value={form.heroCta_en ?? ""}
                    onChange={(e) => setForm({ ...form, heroCta_en: e.target.value })}
                    placeholder="Browse catalog"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Meta Description (EN)</label>
                  <textarea
                    className="input"
                    value={form.metaDescription_en ?? ""}
                    onChange={(e) => setForm({ ...form, metaDescription_en: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Imagen del hero (URL) - compartida ES/EN</label>
                  <input
                    className="input"
                    value={form.heroImage ?? ""}
                    onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Fondo del hero (ES)</label>
                  <input
                    className="input"
                    value={form.heroBackgroundImage ?? ""}
                    onChange={(e) => setForm({ ...form, heroBackgroundImage: e.target.value })}
                    placeholder="/api/thumb/lock/1"
                  />
                </div>
                <div>
                  <label className="text-sm text-ink/70 block mb-1">Fondo del hero (EN)</label>
                  <input
                    className="input"
                    value={form.heroBackgroundImage_en ?? ""}
                    onChange={(e) => setForm({ ...form, heroBackgroundImage_en: e.target.value })}
                    placeholder="/api/thumb/lock/1"
                  />
                  <p className="text-xs text-ink/50 mt-1">
                    Se recomienda una ruta local (<code className="text-ink/70">/api/thumb/lock/N</code>)
                    para no depender de servicios externos. Déjalo vacío para usar un fondo sólido.
                  </p>
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

const PREVIEW_VARIANTS: Record<string, { wrap: string; badge: string; title: string; text: string; cta: string }> = {
  gold: {
    wrap: "bg-champagne border border-gold-500/25",
    badge: "bg-gold-500 text-white",
    title: "text-ink",
    text: "text-ink/70",
    cta: "btn-primary",
  },
  dark: {
    wrap: "bg-ink text-cream",
    badge: "bg-gold-500 text-ink",
    title: "text-cream",
    text: "text-cream/70",
    cta: "btn-primary",
  },
  light: {
    wrap: "bg-white border border-ink/10",
    badge: "bg-ink text-cream",
    title: "text-ink",
    text: "text-ink/70",
    cta: "btn-outline",
  },
  gradient: {
    wrap: "bg-gradient-to-r from-ink via-ink/90 to-[#3d3226] text-cream",
    badge: "bg-gold-500 text-ink",
    title: "text-cream",
    text: "text-cream/70",
    cta: "btn-primary",
  },
};

/** Réplica estática del PromoBanner para previsualizarlo sin salir del admin. */
function BannerPreview({
  title,
  text,
  cta,
  badge,
  image,
  variant,
}: {
  title?: string;
  text?: string;
  cta?: string;
  badge?: string;
  image?: string;
  variant?: string;
}) {
  const s = PREVIEW_VARIANTS[variant ?? "gold"] ?? PREVIEW_VARIANTS.gold;

  if (!title && !text) {
    return <p className="text-sm text-ink/40 italic">Sin contenido: el banner no se mostrará.</p>;
  }

  return (
    <div className={`${s.wrap} rounded-lg px-5 py-6`}>
      <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="w-full md:w-40 h-28 object-cover rounded-lg shrink-0" />
        )}
        <div className="flex-1">
          {badge && <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${s.badge}`}>{badge}</span>}
          {title && <p className={`font-serif text-lg ${s.title}`}>{title}</p>}
          {text && <p className={`text-xs mt-1 ${s.text}`}>{text}</p>}
        </div>
        {cta && <span className={`${s.cta} text-xs shrink-0 pointer-events-none`}>{cta}</span>}
      </div>
    </div>
  );
}