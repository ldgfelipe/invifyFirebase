// ============================================================================
// AI PROMO - Sección de promoción del asistente de IA en la landing.
// Efectiva y atractiva, con copy de marketing y UX/UI diseñada para captar
// clientes interesados en crear invitaciones con IA.
// Mobila, localizada ES/EN, llamado a acción claro.
// ============================================================================
"use client";

import { useLanguage } from "@/lib/i18n/provider";
import { AiWizard } from "./AiWizard";

export function AIPromo() {
  const { t, locale } = useLanguage();
  const isEn = locale === "en";

  const ctaText = isEn ? "Design your invitation with AI" : "Diseña tu invitación con IA";
  const taglineEn = "Answer 4 questions about your event and AI designs it for you. You just customize what you want.";
  const taglineEs = "Responde 4 preguntas sobre tu evento y la IA crea el diseño por ti. Tú solo personalizas lo que quieras.";
  const tagline = isEn ? taglineEn : taglineEs;

  const steps = [
    { label: isEn ? "Event" : "El evento", desc: isEn ? "Tell us about your event" : "Cuéntanos sobre tu evento" },
    { label: isEn ? "Style" : "Estilo", desc: isEn ? "Choose colors and fonts" : "Elige colores y fuentes" },
    { label: isEn ? "Preview" : "Vista previa", desc: isEn ? "See your design instantly" : "Ver tu diseño al instante" },
    { label: isEn ? "Customize" : "Personalizar", desc: isEn ? "Edit text and images" : "Edita texto e imágenes" },
  ];

  return (
    <section
      className="relative overflow-x-hidden bg-cream/30"
      aria-label="Promoción del asistente de IA"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-cream/20 via-transparent to-transparent" />
      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-serif text-5xl text-ink mb-6">
              {isEn ? "Create Beautiful Invitations" : "Crea hermosas invitaciones"}
            </h2>
            <p className="text-ink/60 text-lg mb-8 max-w-xl">
              {tagline}
            </p>
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl border border-ink/20 bg-white"
                >
                  <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-serif text-base text-ink mb-1">
                      {step.label}
                    </h4>
                    <p className="text-xs text-ink/60">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <button
                onClick={() => window.dispatchEvent(new Event("ai:open"))}
                className="btn-primary px-8 py-3 text-base"
                aria-label={isEn ? "Start creating with AI" : "Comenzar con IA"}
              >
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v1.2m0 15.6V21m-4.24-16.24l.85.85m6.78 6.78l.85.85M3 12h1.2m15.6 0H21M4.76 7.76l.85.85m6.78 6.78l.85.85M7 12a5 5 0 0110 0 5 5 0 01-10 0z"
                    />
                  </svg>
                  {ctaText}
                </span>
              </button>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-champagne shadow-lg">
              {/* Placeholder - en producción tendría una preview generada */}
              <div className="p-8 flex items-center justify-center text-ink/60">
                <svg
                  className="w-20 h-20 opacity-20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H11a2 2 0 00-2 2v6a2 2 0 002 2zm0 0V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2m-2-4h10a2 2 0 002-2v-6a2 2 0 00-2-2H11a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}