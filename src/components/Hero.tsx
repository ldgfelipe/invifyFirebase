"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import type { SiteSettings } from "@/lib/types";

export function Hero({ settings }: { settings: SiteSettings }) {
  const { locale, t } = useLanguage();

  const title = locale === "en" && settings.heroTitle_en ? settings.heroTitle_en : settings.heroTitle;
  const subtitle = locale === "en" && settings.heroSubtitle_en ? settings.heroSubtitle_en : settings.heroSubtitle;
  const cta = locale === "en" && settings.heroCta_en ? settings.heroCta_en : settings.heroCta;

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-champagne">
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
    </section>
  );
}
