// ============================================================================
// SITE SETTINGS (servidor, SDK web) - Lee /site/config para el hero y el SEO.
// Las reglas permiten lectura pública; solo admin puede escribir.
// ============================================================================
import { doc, getDoc } from "firebase/firestore";
import { serverDb } from "./firebase/serverClient";
import { DEFAULT_BANNER, type SiteSettings } from "./types";

const DEFAULT_SETTINGS: SiteSettings = {
  heroTitle: "Invitaciones que tus invitados aman",
  heroTitle_en: "Invitations your guests will love",
  heroSubtitle:
    "Crea invitaciones digitales interactivas para bodas, cumpleaños y baby showers. Listas en 3 clics, hermosas y compartibles por WhatsApp.",
  heroSubtitle_en:
    "Create interactive digital invitations for weddings, birthdays and baby showers. Ready in 3 clicks, beautiful and shareable via WhatsApp.",
  heroCta: "Ver catálogo",
  heroCta_en: "Browse catalog",
  heroBackgroundImage: "/api/thumb/lock/1",
  heroBackgroundImage_en: "/api/thumb/lock/1",
  metaDescription:
    "Crea invitaciones digitales interactivas para bodas, cumpleaños y baby showers. Elegantes, personalizables y listas en 3 clics.",
  metaDescription_en:
    "Create interactive digital invitations for weddings, birthdays and baby showers. Elegant, customizable and ready in 3 clicks.",
  banner: DEFAULT_BANNER,
  // GTM que ya estaba funcionando hardcodeado en layout.tsx. Se conserva aquí
  // como default para no perder la analítica al hacerlo editable; el admin
  // puede cambiarlo o vaciarlo desde /admin/settings.
  gtmId: "GTM-MXNTHF83",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const snap = await getDoc(doc(serverDb, "site", "config"));
    if (snap.exists()) {
      const data = snap.data() as SiteSettings;
      // Merge sobre los defaults: si el documento no tiene banner todavía,
      // la página sigue teniendo el valor por defecto en vez de undefined.
      return {
        ...DEFAULT_SETTINGS,
        ...data,
        banner: { ...DEFAULT_BANNER, ...(data.banner ?? {}) },
      };
    }
  } catch {
    // Si no existe o falla, usamos los valores por defecto.
  }
  return DEFAULT_SETTINGS;
}
