"use client";

// ============================================================================
// WIZARD IA - Formulario de 4 pasos para crear una invitación con IA.
// Paso 1: El evento | Paso 2: La atmósfera | Paso 3: Funciones | Paso 4: Estilo
// Al finalizar envía /api/ai/generate-template y redirige a /pricing.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n/provider";
import {
  ATMOSPHERE_OPTIONS,
  CATEGORY_OPTIONS,
  FEATURE_OPTIONS,
  IMAGE_STYLE_OPTIONS,
  DEFAULT_ANSWERS,
  type WizardAnswers,
} from "@/lib/ai/options";
import { cn } from "@/lib/cn";

const STEPS = [1, 2, 3, 4] as const;

function label(id: string, map: Record<string, string>): string {
  return map[id] ?? id;
}

export function AiWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<(typeof STEPS)[number]>(1);
  const [answers, setAnswers] = useState<WizardAnswers>(DEFAULT_ANSWERS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stepValid = (): boolean => {
    if (step === 1) {
      return !!answers.category && !!answers.names.trim() && !!answers.date;
    }
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return !!answers.imageStyle;
    return false;
  };

  function toggleFeature(id: string) {
    setAnswers((a) => ({
      ...a,
      features: a.features.includes(id)
        ? a.features.filter((f) => f !== id)
        : [...a.features, id],
    }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

      const res = await fetch("/api/ai/generate-template", {
        method: "POST",
        headers,
        body: JSON.stringify({ language: locale, ...answers }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t.aiwiz.error);
      }
      // Flujo de cierre: el usuario paga en /pricing la plantilla IA generada
      // (que vive en /demoTemplates). Se pasa el templateId para que el checkout
      // y el procesado de la compra enlacen Y clonen exactamente esa plantilla.
      const data = await res.json().catch(() => ({}));
      const demoId =
        typeof data?.id === "string"
          ? data.id
          : (data?.template?.id as string | undefined);
      router.push(demoId ? `/pricing?template=${encodeURIComponent(demoId)}` : "/pricing");
    } catch (err: any) {
      setError(err?.message || t.aiwiz.error);
      setBusy(false);
    }
  }

  function next() {
    if (!stepValid()) {
      setError(t.aiwiz.required);
      return;
    }
    setError(null);
    if (step === STEPS[STEPS.length - 1]) {
      submit();
    } else {
      setStep((s) => (s + 1) as typeof STEPS[number]);
    }
  }

  const stepTitles = [t.aiwiz.s1.title, t.aiwiz.s2.title, t.aiwiz.s3.title, t.aiwiz.s4.title];
  const stepSubtitles = [t.aiwiz.s1.subtitle, t.aiwiz.s2.subtitle, t.aiwiz.s3.subtitle, t.aiwiz.s4.subtitle];
  const progress = ((step - 1) / STEPS.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.aiwiz.modalTitle}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="p-6 pb-4 border-b border-ink/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-2xl text-ink">{t.aiwiz.modalTitle}</h3>
              <p className="text-sm text-ink/60 mt-1">{t.aiwiz.modalSubtitle}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={t.aiwiz.cancel}
              className="text-ink/40 hover:text-ink transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progreso */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-ink/50">
                <span className="text-ink">{t.aiwiz.stepLabel} {step}</span> {t.aiwiz.of} {STEPS.length} ·{" "}
                {stepTitles[step - 1]}
              </p>
            </div>
            <div className="h-1.5 w-full bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-gold-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-1.5 mt-2">
              {STEPS.map((s) => (
                <span
                  key={s}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition",
                    s <= step ? "bg-gold-500" : "bg-ink/10"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="p-6">
          <h4 className="font-serif text-xl text-ink">{stepSubtitles[step - 1]}</h4>

          {step === 1 && (
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-medium text-ink mb-2">{t.aiwiz.s1.subtitle}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {CATEGORY_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, category: o.id }))}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-sm transition text-left",
                        answers.category === o.id
                          ? "border-gold-500 bg-gold-50 text-ink font-medium"
                          : "border-ink/15 hover:border-gold-300"
                      )}
                    >
                      {label(o.key, t.aiwiz.categories as unknown as Record<string, string>)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  {t.aiwiz.s1.namesLabel}
                </label>
                <input
                  className="input"
                  type="text"
                  value={answers.names}
                  placeholder={t.aiwiz.s1.namesPlaceholder}
                  onChange={(e) => setAnswers((a) => ({ ...a, names: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  {t.aiwiz.s1.dateLabel}
                </label>
                <input
                  className="input"
                  type="date"
                  value={answers.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setAnswers((a) => ({ ...a, date: e.target.value }))}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ATMOSPHERE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, atmosphere: o.id }))}
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    answers.atmosphere === o.id
                      ? "border-gold-500 bg-gold-50"
                      : "border-ink/15 hover:border-gold-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-7 h-7 rounded-full border border-ink/10"
                      style={{
                        background: `linear-gradient(135deg, ${o.palette.primary}, ${o.palette.background})`,
                      }}
                    />
                    <span className="text-sm font-medium text-ink">
                      {label(o.nameKey, t.aiwiz.atmosphere as unknown as Record<string, string>)}
                    </span>
                  </div>
                  <p className="text-xs text-ink/60">
                    {label(o.descKey, t.aiwiz.atmosphere as unknown as Record<string, string>)}
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 grid grid-cols-1 gap-2.5">
              {FEATURE_OPTIONS.map((o) => {
                const active = answers.features.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleFeature(o.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
                      active
                        ? "border-gold-500 bg-gold-50 text-ink font-medium"
                        : "border-ink/15 hover:border-gold-300 text-ink/80"
                    )}
                  >
                    <span>{label(o.key, t.aiwiz.features as unknown as Record<string, string>)}</span>
                    <span
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition",
                        active ? "bg-gold-500 border-gold-500 text-white" : "border-ink/25"
                      )}
                    >
                      {active && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {IMAGE_STYLE_OPTIONS.map((o) => {
                const seed = `invify-${answers.category}-${o.id}`;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, imageStyle: o.id }))}
                    className={cn(
                      "rounded-xl border overflow-hidden text-left transition",
                      answers.imageStyle === o.id
                        ? "border-gold-500 ring-2 ring-gold-500/40"
                        : "border-ink/15 hover:border-gold-300"
                    )}
                  >
                    <img
                      src={`https://picsum.photos/seed/${seed}/240/160`}
                      alt={label(o.key, t.aiwiz.imageStyles as unknown as Record<string, string>)}
                      className="w-full h-20 object-cover"
                      loading="lazy"
                    />
                    <span
                      className={cn(
                        "block px-3 py-2 text-xs",
                        answers.imageStyle === o.id ? "text-ink font-medium" : "text-ink/70"
                      )}
                    >
                      {label(o.key, t.aiwiz.imageStyles as unknown as Record<string, string>)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex items-center justify-between gap-3">
          <button
            onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as typeof STEPS[number]))}
            disabled={busy}
            className="btn-outline px-6"
          >
            {step === 1 ? t.aiwiz.cancel : t.aiwiz.back}
          </button>
          <button onClick={next} disabled={busy} className="btn-primary px-8">
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                {t.aiwiz.generating}
              </span>
            ) : step === STEPS[STEPS.length - 1] ? (
              t.aiwiz.generate
            ) : (
              t.aiwiz.next
            )}
          </button>
        </div>
      </div>
    </div>
  );
}