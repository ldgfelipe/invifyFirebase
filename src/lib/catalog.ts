// ============================================================================
// CATÁLOGO (servidor, SDK WEB) - Lecturas públicas para SSR/SEO.
// Usa el SDK web con tu apiKey (no requiere cuenta de servicio). Las reglas
// de Firestore ya permiten estas lecturas (plantillas activas e invitaciones
// publicadas).
// ============================================================================
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { serverDb } from "./firebase/serverClient";
import type { Template, TemplateCategory } from "./types";

export const CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "boda", label: "Bodas" },
  { id: "cumpleanos", label: "Cumpleaños" },
  { id: "babyshower", label: "Baby Shower" },
  { id: "bautizo", label: "Bautizos" },
  { id: "corporativo", label: "Corporativo" },
];

export async function getActiveTemplates(
  category?: TemplateCategory
): Promise<Template[]> {
  const base = query(
    collection(serverDb, "templates"),
    where("active", "==", true),
    orderBy("createdAt", "desc")
  );
  const q = category
    ? query(base, where("category", "==", category))
    : base;
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Template);
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  const q = query(
    collection(serverDb, "invitations"),
    where("status", "==", "published")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as any).slug as string);
}
