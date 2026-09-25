"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import type { SiteSettings } from "@/lib/types";

export function Hero({ settings }: { settings: SiteSettings }) {
  const { locale, t } = useLanguage();

  const title = locale === "en" && settings.heroTitle_en ? settings.heroTitle_en : settings.heroTitle;
  const subtitle = locale === "en" && settings.heroSubtitle_en ? settings.heroSubtitle_en : settings.heroSubtitle;
  const cta = locale === "en" && settings.heroCta_en ? settings.heroCta_en : settings.heroCta;

  // Imagen de fondo asociada desde el admin (o desde el seed). En inglés se
  // puede definir una distinta; si no, se reutiliza la de español.
  const bg =
    (locale === "en" && settings.heroBackgroundImage_en) || settings.heroBackgroundImage || "";

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-champagne overflow-hidden">
      {bg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Velo para mantener el contraste del texto sobre cualquier imagen. */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/65 to-champagne/85" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center">
        <p className="uppercase tracking-[0.3em] text-gold-500 text-sm mb-4">{t.hero.badge}</p>
        <h1 className="font-serif text-5xl md:text-7xl text-ink max-w-3xl">{title}</h1>
        <p className="mt-4 text-ink/70 max-w-xl">{subtitle}</p>
        <div className="mt-8 flex gap-4">
          <Link href="/templates" className="btn-primary">
            {cta || t.hero.ctaCatalog}
          </Link>
          <Link href="/pricing" className="btn-outline">
            {t.hero.ctaPricing}
          </Link>
        </div>
      </div>
    </section>
  );
}
