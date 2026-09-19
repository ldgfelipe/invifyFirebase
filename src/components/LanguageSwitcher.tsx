"use client";

import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  return (
    <div className="flex items-center gap-1 p-1 bg-ink/5 rounded-full">
      <button
        onClick={() => setLocale("es")}
        className={cn("text-xs px-2.5 py-1 rounded-full transition", locale === "es" ? "bg-white shadow text-ink font-medium" : "text-ink/60 hover:text-ink")}
        aria-label="Español"
      >
        ES
      </button>
      <button
        onClick={() => setLocale("en")}
        className={cn("text-xs px-2.5 py-1 rounded-full transition", locale === "en" ? "bg-white shadow text-ink font-medium" : "text-ink/60 hover:text-ink")}
        aria-label="English"
      >
        EN
      </button>
      {!compact && <span className="text-[10px] text-ink/40 ml-1 hidden sm:inline">{locale === "es" ? "Español" : "English"}</span>}
    </div>
  );
}
