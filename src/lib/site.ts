// ============================================================================
// SITE SETTINGS (servidor, SDK web) - Lee /site/config para el hero y el SEO.
// Las reglas permiten lectura pública; solo admin puede escribir.
// ============================================================================
import { doc, getDoc } from "firebase/firestore";
import { serverDb } from "./firebase/serverClient";
import type { SiteSettings } from "./types";

const DEFAULT_SETTINGS: SiteSettings = {
  heroTitle: "Invitaciones que tus invitados aman",
  heroSubtitle:
    "Crea invitaciones digitales interactivas para bodas, cumpleaños y baby showers. Listas en 3 clics, hermosas y compartibles por WhatsApp.",
  heroCta: "Ver catálogo",
  metaDescription:
    "Crea invitaciones digitales interactivas para bodas, cumpleaños y baby showers. Elegantes, personalizables y listas en 3 clics.",
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
