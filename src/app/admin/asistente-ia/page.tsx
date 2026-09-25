"use client";

// ============================================================================
// ADMIN /asistente-ia
// Configura el asistente que genera plantillas con IA:
//   - Conexión (apiKey, baseUrl, modelo)
//   - Comportamiento (temperatura, tokens, idioma, fallback, límites)
//   - Prompts (instrucción de sistema + reglas de negocio)
//   - Imágenes generadas (locales o picsum)
// La apiKey nunca se devuelve en claro: el GET la enmascara y el PUT solo la
// reemplaza si el admin escribe un valor nuevo.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PROVIDERS, resolveProvider } from "@/lib/ai/providers";
import type { AiSettingsPublic } from "@/lib/types";

type Tab = "conexion" | "comportamiento" | "prompts" | "imagenes";

type FormState = Omit<AiSettingsPublic, "lastTest" | "updatedAt" | "updatedBy"> & {
  apiKey: string;
};

const EMPTY: FormState = {
  enabled: false,
  provider: "openai",
  apiKey: "",
  apiKeyMasked: "",
  hasApiKey: false,
  apiKeyFromEnv: false,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  temperature: 0.6,
  maxTokens: 2000,
  systemPrompt: "",
  customInstructions: "",
  languageMode: "auto",
  fallbackToMock: true,
  imageSource: "local",
  maxGenerationsPerDay: 0,
  defaultNames: "",
  defaultNamesEn: "",
};

const TABS: { id: Tab; label: string }[] = [
  { id: "conexion", label: "🔌 Conexión" },
  { id: "comportamiento", label: "⚙️ Comportamiento" },
  { id: "prompts", label: "📝 Prompts" },
  { id: "imagenes", label: "🖼️ Imágenes" },
];

const MODEL_SUGGESTIONS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "gpt-3.5-turbo"];

/** Agrupa el catálogo por familia para que el selector no sea una lista plana. */
const PROVIDER_GROUPS: [string, typeof PROVIDERS][] = (() => {
  const map = new Map<string, typeof PROVIDERS>();
  for (const p of PROVIDERS) {
    const list = map.get(p.group) ?? [];
    map.set(p.group, [...list, p]);
  }
  return [...map.entries()];
})();

export default function AdminAiSettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [lastTest, setLastTest] = useState<AiSettingsPublic["lastTest"] | undefined>();
  const [updatedAt, setUpdatedAt] = useState<number | undefined>();
  const [tab, setTab] = useState<Tab>("conexion");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [remoteModels, setRemoteModels] = useState<string[]>([]);
  const [modelMsg, setModelMsg] = useState<string | null>(null);
  const [baseUrlEdited, setBaseUrlEdited] = useState(false);

  const preset = useMemo(() => resolveProvider(form.provider), [form.provider]);

  const keyPlaceholder =
    preset?.id === "gemini"
      ? "AIza… (Google AI Studio)"
      : preset?.id === "cloudflare"
        ? "Token de cuenta de Cloudflare"
        : "sk-… / gsk_… / xai-…";

  /**
   * Cambiar de proveedor arrastra su base y su modelo por defecto, salvo que el
   * admin ya haya escrito una base a mano: en ese caso se respeta su URL para no
   * borrar un proxy configurado a propósito.
   */
  function selectProvider(id: FormState["provider"]) {
    const next = resolveProvider(id);
    setForm((f) => ({
      ...f,
      provider: next.id,
      baseUrl: baseUrlEdited && next.baseUrl === "" ? f.baseUrl : next.baseUrl,
      model: next.defaultModel || f.model,
    }));
    setRemoteModels([]);
    setModelMsg(null);
  }

  /** Pregunta al proveedor qué modelos permite esta clave. */
  async function loadModels() {
    setLoadingModels(true);
    setModelMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/ai-config/models", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          provider: form.provider,
          baseUrl: form.baseUrl,
          apiKey: form.apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar los modelos");
      setRemoteModels(data.models ?? []);
      setModelMsg(data.message ?? null);
    } catch (e: any) {
      setErr(e.message);
      setModelMsg(null);
    } finally {
      setLoadingModels(false);
    }
  }
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const authHeaders = useCallback(async () => {
    if (!user) throw new Error("Sesión no disponible");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    };
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/ai-config", { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No autorizado");
      const s = data.settings as AiSettingsPublic;
      setForm({
        enabled: s.enabled,
        provider: s.provider,
        apiKey: "",
        apiKeyMasked: s.apiKeyMasked,
        hasApiKey: s.hasApiKey,
        apiKeyFromEnv: s.apiKeyFromEnv,
        baseUrl: s.baseUrl,
        model: s.model,
        temperature: s.temperature,
        maxTokens: s.maxTokens,
        systemPrompt: s.systemPrompt,
        customInstructions: s.customInstructions,
        languageMode: s.languageMode,
        fallbackToMock: s.fallbackToMock,
        imageSource: s.imageSource,
        maxGenerationsPerDay: s.maxGenerationsPerDay,
        defaultNames: s.defaultNames,
        defaultNamesEn: s.defaultNamesEn,
      });
      setLastTest(s.lastTest);
      setUpdatedAt(s.updatedAt);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, authHeaders]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function save() {
    setErr(null);
    setMsg(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      delete (payload as any).apiKeyMasked;
      delete (payload as any).hasApiKey;
      delete (payload as any).apiKeyFromEnv;

      const res = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      const s = data.settings as AiSettingsPublic;
      setLastTest(s.lastTest);
      setUpdatedAt(s.updatedAt);
      setForm((prev) => ({ ...prev, apiKey: "", apiKeyMasked: s.apiKeyMasked, hasApiKey: s.hasApiKey }));
      setMsg("Configuración del asistente guardada.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setErr(null);
    setMsg(null);
    setTesting(true);
    try {
      const res = await fetch("/api/admin/ai-config/test", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          provider: form.provider,
          apiKey: form.apiKey,
          baseUrl: form.baseUrl,
          model: form.model,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error probando la conexión");
      setLastTest(data.result);
      setMsg(data.result.ok ? "Conexión verificada." : "La prueba falló (ver detalle).");
      if (!data.result.ok) setErr(data.result.message);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <p className="text-ink/60">Cargando configuración del asistente…</p>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="section-title">Asistente IA</h1>
          <p className="text-ink/60 text-sm">
            Configura el generador de invitaciones con IA (modelo, prompts, límites e imágenes).
          </p>
        </div>
        <span
          className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium ${
            form.enabled ? "bg-green-100 text-green-700" : "bg-ink/10 text-ink/60"
          }`}
        >
          {form.enabled ? "IA activa" : "IA apagada (mock)"}
        </span>
      </div>

      {updatedAt && (
        <p className="text-ink/40 text-xs mb-4">
          Última actualización: {new Date(updatedAt).toLocaleString("es-MX")}
        </p>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-ink/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === t.id
                ? "bg-white text-gold-500 border-b-2 border-gold-500"
                : "text-ink/50 hover:text-ink/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-6">
        {/* ---------------------------------------------------------- Conexión */}
        {tab === "conexion" && (
          <>
            <label className="flex items-start gap-3 p-4 rounded-lg border border-ink/10 bg-cream/40">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span>
                <span className="block font-medium text-ink">Activar la IA</span>
                <span className="block text-sm text-ink/60">
                  Al apagarla, el asistente sigue funcionando con el generador determinista (mock),
                  sin consumir créditos.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-ink/70 block mb-1">Proveedor</label>
                <select
                  className="input"
                  value={form.provider}
                  onChange={(e) => selectProvider(e.target.value as FormState["provider"])}
                >
                  {PROVIDER_GROUPS.map(([group, items]) => (
                    <optgroup key={group} label={group}>
                      {items.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {preset && (
                  <p className="text-xs text-ink/50 mt-1">
                    Formato de API:{" "}
                    <code className="text-ink/70">{preset.wire === "gemini" ? "Gemini (generateContent)" : "OpenAI-compatible (chat/completions)"}</code>
                    {preset.requiresKey ? "" : " · no requiere API key"}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Modelo</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    list="ai-model-suggestions"
                    value={form.model}
                    onChange={(e) => set("model", e.target.value)}
                    placeholder={preset?.defaultModel || "gpt-4o-mini"}
                  />
                  {preset?.canListModels && (
                    <button
                      type="button"
                      onClick={loadModels}
                      disabled={loadingModels}
                      className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-ink/15 text-ink/70 hover:bg-cream disabled:opacity-50 whitespace-nowrap"
                      title="Preguntar al proveedor qué modelos permite esta clave"
                    >
                      {loadingModels ? "Cargando…" : "Ver modelos"}
                    </button>
                  )}
                </div>
                <datalist id="ai-model-suggestions">
                  {(remoteModels.length ? remoteModels : (preset?.models ?? MODEL_SUGGESTIONS)).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                {modelMsg && (
                  <p className="text-xs text-ink/50 mt-1">
                    {remoteModels.length ? `${modelMsg} ·` : modelMsg}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-ink/70 block mb-1">Base URL</label>
              <input
                className="input"
                value={form.baseUrl}
                onChange={(e) => {
                  set("baseUrl", e.target.value);
                  setBaseUrlEdited(true);
                }}
                placeholder={preset?.baseUrl || "https://api.openai.com/v1"}
              />
              <p className="text-xs text-ink/50 mt-1">
                {preset?.wire === "gemini"
                  ? "Base de Google AI Studio, hasta /v1beta. No se le añade /chat/completions."
                  : "Debe incluir /v1. Ejemplo: https://api.openai.com/v1"}
                {baseUrlEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      set("baseUrl", preset?.baseUrl ?? "");
                      setBaseUrlEdited(false);
                    }}
                    className="ml-2 underline hover:text-ink/80"
                  >
                    Restaurar la del proveedor
                  </button>
                )}
              </p>
              {preset?.note && (
                <p className="text-xs text-amber-700/90 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                  {preset.note}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-ink/70 block mb-1">API Key</label>
              <input
                className="input"
                type="password"
                autoComplete="off"
                value={form.apiKey}
                onChange={(e) => set("apiKey", e.target.value)}
                placeholder={form.hasApiKey ? form.apiKeyMasked : keyPlaceholder}
              />
              <p className="text-xs text-ink/50 mt-1">
                {form.apiKeyFromEnv
                  ? "La clave actual viene de una variable de entorno (AI_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY…). Escríbela aquí para sobrescribirla."
                  : form.hasApiKey
                    ? `Clave guardada: ${form.apiKeyMasked}. Déjala vacía para conservarla.`
                    : preset?.requiresKey
                      ? `No hay clave guardada para ${preset.label}. La IA no podrá ejecutarse hasta que la configures.`
                      : `${preset?.label} no necesita clave. Este campo se ignora.`}
              </p>
            </div>

            {lastTest && (
              <div
                className={`p-3 rounded-lg text-sm border ${
                  lastTest.ok
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <p className="font-medium">
                  Último test: {lastTest.ok ? "correcto" : "fallido"}
                  {lastTest.model ? ` · ${lastTest.model}` : ""}
                  {typeof lastTest.latencyMs === "number" ? ` · ${lastTest.latencyMs} ms` : ""}
                </p>
                <p className="break-words">{lastTest.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(lastTest.at).toLocaleString("es-MX")}
                </p>
              </div>
            )}

            <button
              onClick={testConnection}
              disabled={testing}
              className="btn-outline"
            >
              {testing ? "Probando…" : "Probar conexión"}
            </button>
          </>
        )}

        {/* ----------------------------------------------------- Comportamiento */}
        {tab === "comportamiento" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-ink/70 block mb-1">
                  Temperatura — {form.temperature.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={form.temperature}
                  onChange={(e) => set("temperature", Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-ink/50 mt-1">
                  Bajo (0–0.3) = más preciso y consistente. Alto (1+) = más creativo.
                </p>
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Tokens máximos</label>
                <input
                  className="input"
                  type="number"
                  min={64}
                  max={16000}
                  step={64}
                  value={form.maxTokens}
                  onChange={(e) => set("maxTokens", Number(e.target.value))}
                />
                <p className="text-xs text-ink/50 mt-1">Límite de la respuesta del modelo.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-ink/70 block mb-1">Idioma de salida</label>
                <select
                  className="input"
                  value={form.languageMode}
                  onChange={(e) => set("languageMode", e.target.value as FormState["languageMode"])}
                >
                  <option value="auto">Automático (según el usuario)</option>
                  <option value="es">Forzar español</option>
                  <option value="en">Forzar inglés</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Máx. generaciones por día</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.maxGenerationsPerDay}
                  onChange={(e) => set("maxGenerationsPerDay", Number(e.target.value))}
                />
                <p className="text-xs text-ink/50 mt-1">0 = sin límite.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-ink/70 block mb-1">Nombres por defecto (ES)</label>
                <input
                  className="input"
                  value={form.defaultNames}
                  onChange={(e) => set("defaultNames", e.target.value)}
                  placeholder="Ana & Carlos"
                />
              </div>
              <div>
                <label className="text-sm text-ink/70 block mb-1">Nombres por defecto (EN)</label>
                <input
                  className="input"
                  value={form.defaultNamesEn}
                  onChange={(e) => set("defaultNamesEn", e.target.value)}
                  placeholder="Ana & Carlos"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-lg border border-ink/10">
              <input
                type="checkbox"
                checked={form.fallbackToMock}
                onChange={(e) => set("fallbackToMock", e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span>
                <span className="block font-medium text-ink">Usar mock si la IA falla</span>
                <span className="block text-sm text-ink/60">
                  Recomendado: si apagas la clave o el proveedor falla, el asistente entrega una
                  plantilla generada localmente en lugar de un error.
                </span>
              </span>
            </label>
          </>
        )}

        {/* ------------------------------------------------------------ Prompts */}
        {tab === "prompts" && (
          <>
            <div>
              <label className="text-sm text-ink/70 block mb-1">Instrucción de sistema</label>
              <textarea
                className="input mt-1 h-32"
                value={form.systemPrompt}
                onChange={(e) => set("systemPrompt", e.target.value)}
                placeholder="Eres un diseñador web experto en invitaciones digitales…"
              />
              <p className="text-xs text-ink/50 mt-1">
                Define el rol y el tono con el que responde el modelo.
              </p>
            </div>

            <div>
              <label className="text-sm text-ink/70 block mb-1">Reglas adicionales</label>
              <textarea
                className="input mt-1 h-40"
                value={form.customInstructions}
                onChange={(e) => set("customInstructions", e.target.value)}
                placeholder={"- Usa siempre la paleta indicada\n- Textos breves"}
              />
              <p className="text-xs text-ink/50 mt-1">
                Se anexan al prompt en cada generación. Úsalo para imponer reglas de la marca.
              </p>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-ink/70">Ver el prompt que se enviará</summary>
              <pre className="mt-2 p-3 rounded-lg bg-ink/5 text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">
                {form.systemPrompt}
                {"\n\n---\n\n"}
                {form.customInstructions}
              </pre>
            </details>
          </>
        )}

        {/* ----------------------------------------------------------- Imágenes */}
        {tab === "imagenes" && (
          <>
            <div>
              <label className="text-sm text-ink/70 block mb-1">Origen de las imágenes</label>
              <select
                className="input"
                value={form.imageSource}
                onChange={(e) => set("imageSource", e.target.value as FormState["imageSource"])}
              >
                <option value="local">Locales (/api/thumb/lock/N) — recomendado</option>
                <option value="picsum">Externas (picsum.photos)</option>
              </select>
              <p className="text-xs text-ink/50 mt-1">
                Las imágenes locales se sirven desde tu propio dominio: no dependen de un tercero
                y no se rompen si el servicio externo cae.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-cream/60 border border-ink/10 text-sm space-y-2">
              <p className="font-medium text-ink">Vista previa</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((n) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={n}
                    src={
                      form.imageSource === "local"
                        ? `/api/thumb/lock/${n}`
                        : `https://picsum.photos/seed/invify${n}/320/240`
                    }
                    alt={`Muestra ${n}`}
                    className="w-32 h-24 object-cover rounded-lg border border-ink/10"
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {err && <p className="text-red-600 text-sm mt-4 break-words">{err}</p>}
      {msg && <p className="text-green-600 text-sm mt-4">{msg}</p>}

      <div className="flex items-center gap-3 mt-6">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
        <button onClick={load} disabled={saving} className="btn-outline">
          Descartar cambios
        </button>
      </div>
    </div>
  );
}
