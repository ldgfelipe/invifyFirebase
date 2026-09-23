"use client";

// ============================================================================
// CTA IA - Botón "Diseña tu invitación con IA" que abre el wizard (4 pasos).
// Se monta debajo del Hero en la landing.
// ============================================================================
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { AiWizard } from "./AiWizard";

export function AiCta() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <section className="px-6 pb-10">
      <div className="max-w-3xl mx-auto text-center bg-white border border-ink/10 rounded-2xl p-8 shadow-soft">
        <h3 className="font-serif text-3xl text-ink">{t.aiwiz.modalTitle}</h3>
        <p className="text-ink/60 mt-2 mb-6">{t.aiwiz.ctaTagline}</p>
        <button
          onClick={() => setOpen(true)}
          className="btn-primary px-8 py-3 text-base"
        >
          <span className="inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1.2m0 15.6V21m-4.24-16.24l.85.85m6.78 6.78l.85.85M3 12h1.2m15.6 0H21M4.76 7.76l.85.85m6.78 6.78l.85.85M7 12a5 5 0 0110 0 5 5 0 01-10 0z"
              />
            </svg>
            {t.aiwiz.cta}
          </span>
        </button>
      </div>
      <AiWizard open={open} onClose={() => setOpen(false)} />
    </section>
  );
}