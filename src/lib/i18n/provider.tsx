"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, getDictionary, type Locale } from "./dictionaries";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (typeof dictionaries)[Locale];
};

const LanguageContext = createContext<Ctx>({
  locale: "es",
  setLocale: () => {},
  t: dictionaries.es,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const saved = localStorage.getItem("invify_locale") as Locale | null;
    const browser = navigator.language.startsWith("en") ? "en" : "es";
    const initial = saved ?? (browser as Locale);
    if (initial === "en" || initial === "es") {
      setLocaleState(initial);
      document.documentElement.lang = initial;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("invify_locale", locale);
  }, [locale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
  }

  const t = getDictionary(locale);

  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
