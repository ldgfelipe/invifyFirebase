// ============================================================================
// i18n - Diccionarios ES/EN para Invify
// Tipado para autocompletado y fallback a ES
// ============================================================================
export type Locale = "es" | "en";

export const dictionaries = {
  es: {
    header: {
      catalog: "Catálogo",
      pricing: "Planes",
      login: "Iniciar sesión",
      dashboard: "Panel",
      logout: "Salir",
    },
    hero: {
      badge: "✨ Invify - Invitaciones digitales",
      ctaCatalog: "Ver catálogo",
      ctaPricing: "Ver planes",
    },
    catalog: {
      title: "Catálogo de plantillas",
      subtitle: "diseños listos para personalizar.",
      all: "Todas",
    },
    footer: {
      rights: "© 2026 Invify. Todos los derechos reservados.",
      privacy: "Aviso de privacidad",
      contact: "Contacto",
    },
    lang: {
      es: "Español",
      en: "English",
    },
  },
  en: {
    header: {
      catalog: "Catalog",
      pricing: "Pricing",
      login: "Log in",
      dashboard: "Dashboard",
      logout: "Log out",
    },
    hero: {
      badge: "✨ Invify - Digital invitations",
      ctaCatalog: "Browse catalog",
      ctaPricing: "View pricing",
    },
    catalog: {
      title: "Template catalog",
      subtitle: "designs ready to customize.",
      all: "All",
    },
    footer: {
      rights: "© 2026 Invify. All rights reserved.",
      privacy: "Privacy policy",
      contact: "Contact",
    },
    lang: {
      es: "Español",
      en: "English",
    },
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.es;
}
