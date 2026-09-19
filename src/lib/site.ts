// ============================================================================
// SITE SETTINGS (servidor, SDK web) - Lee /site/config para el hero y el SEO.
// Las reglas permiten lectura pública; solo admin puede escribir.
// ============================================================================
import { doc, getDoc } from "firebase/firestore";
import { serverDb } from "./firebase/serverClient";
import type { SiteSettings } from "./types";

const DEFAULT_SETTINGS: SiteSettings = {
  heroTitle: "Invitaciones que tus invitados aman",
  heroTitle_en: "Invitations your guests will love",
  heroSubtitle:
    "Crea invitaciones digitales interactivas para bodas, cumpleaños y baby showers. Listas en 3 clics, hermosas y compartibles por WhatsApp.",
  heroSubtitle_en:
    "Create interactive digital invitations for weddings, birthdays and baby showers. Ready in 3 clicks, beautiful and shareable via WhatsApp.",
  heroCta: "Ver catálogo",
  heroCta_en: "Browse catalog",
  metaDescription:
    "Crea invitaciones digitales interactivas para bodas, cumpleaños y baby showers. Elegantes, personalizables y listas en 3 clics.",
  metaDescription_en:
    "Create interactive digital invitations for weddings, birthdays and baby showers. Elegant, customizable and ready in 3 clicks.",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const snap = await getDoc(doc(serverDb, "site", "config"));
    if (snap.exists()) return snap.data() as SiteSettings;
  } catch {
    // Si no existe o falla, usamos los valores por defecto.
  }
  return DEFAULT_SETTINGS;
}
