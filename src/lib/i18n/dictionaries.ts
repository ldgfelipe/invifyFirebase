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
    aiwiz: {
      cta: "Diseña tu invitación con IA",
      ctaTagline:
        "Responde 4 preguntas sobre tu evento y la IA crea el diseño por ti. Tú solo personalizas lo que quieras.",
      modalTitle: "Crea tu invitación con IA",
      modalSubtitle:
        "Cuéntanos sobre tu evento y en segundos tendrás tu diseño listo para personalizar.",
      stepLabel: "Paso",
      of: "de",
      back: "Atrás",
      next: "Siguiente",
      generate: "Generar mi invitación",
      generating: "Creando tu invitación…",
      cancel: "Cancelar",
      error:
        "Ocurrió un error al generar tu invitación. Inténtalo de nuevo.",
      required: "Completa este paso para continuar.",
      s1: {
        title: "El evento",
        subtitle: "¿Qué celebramos?",
        namesLabel: "Nombres principales",
        namesPlaceholder: "Ej. Ana & Luis",
        dateLabel: "¿Cuándo es?",
      },
      s2: {
        title: "La atmósfera",
        subtitle: "¿Cómo imaginas tu evento?",
      },
      s3: {
        title: "Funciones",
        subtitle: "¿Qué quieres incluir?",
      },
      s4: {
        title: "Estilo visual",
        subtitle: "¿Qué tipo de imágenes te gustaría usar de base?",
      },
      categories: {
        boda: "Boda",
        cumpleanos: "Cumpleaños",
        xv: "XV años",
        babyshower: "Baby Shower",
        bautizo: "Bautizo",
        corporativo: "Corporativo",
      },
      atmosphere: {
        elegant: "Elegante y de noche",
        elegantDesc: "Dorados, oscuro y formal",
        natural: "Fresco y natural",
        naturalDesc: "Verdes suaves y luz natural",
        minimal: "Minimalista",
        minimalDesc: "Colores neutros, mucho aire",
        playful: "Juguetón y colorido",
        playfulDesc: "Atrevido, alegre y divertido",
      },
      features: {
        location: "Mapa y ubicación",
        giftTable: "Mesa de regalos",
        dresscode: "Código de vestimenta",
        itinerary: "Itinerario o cronograma",
        rsvp: "Confirmación de asistencia",
      },
      imageStyles: {
        flowers: "Flores",
        party: "Luces de fiesta",
        abstract: "Abstracto",
      },
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
    aiwiz: {
      cta: "Design your invitation with AI",
      ctaTagline:
        "Answer 4 questions about your event and AI designs it for you. You just customize what you want.",
      modalTitle: "Create your invitation with AI",
      modalSubtitle:
        "Tell us about your event and in seconds you'll have your design ready to customize.",
      stepLabel: "Step",
      of: "of",
      back: "Back",
      next: "Next",
      generate: "Generate my invitation",
      generating: "Creating your invitation…",
      cancel: "Cancel",
      error:
        "There was an error generating your invitation. Please try again.",
      required: "Complete this step to continue.",
      s1: {
        title: "The event",
        subtitle: "What are we celebrating?",
        namesLabel: "Main names",
        namesPlaceholder: "e.g. Ana & Luis",
        dateLabel: "When is it?",
      },
      s2: {
        title: "The atmosphere",
        subtitle: "How do you picture your event?",
      },
      s3: {
        title: "Features",
        subtitle: "What would you like to include?",
      },
      s4: {
        title: "Visual style",
        subtitle: "What kind of images would you like as a base?",
      },
      categories: {
        boda: "Wedding",
        cumpleanos: "Birthday",
        xv: "Quinceañera",
        babyshower: "Baby Shower",
        bautizo: "Baptism",
        corporativo: "Corporate",
      },
      atmosphere: {
        elegant: "Elegant at night",
        elegantDesc: "Gold, dark and formal",
        natural: "Fresh & natural",
        naturalDesc: "Soft greens and natural light",
        minimal: "Minimalist",
        minimalDesc: "Neutral colors, lots of air",
        playful: "Playful & colorful",
        playfulDesc: "Bold, cheerful and fun",
      },
      features: {
        location: "Map & location",
        giftTable: "Gift table",
        dresscode: "Dress code",
        itinerary: "Itinerary",
        rsvp: "Attendance confirmation",
      },
      imageStyles: {
        flowers: "Flowers",
        party: "Party lights",
        abstract: "Abstract",
      },
    },
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.es;
}
