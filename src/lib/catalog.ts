// ============================================================================
// CATÁLOGO (servidor, SDK WEB) - Lecturas públicas para SSR/SEO.
// Usa el SDK web con tu apiKey (no requiere cuenta de servicio). Las reglas
// de Firestore ya permiten estas lecturas (plantillas activas e invitaciones
// publicadas).
// ============================================================================
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { serverDb } from "./firebase/serverClient";
import type { Template, TemplateCategory, BuilderConfig, InvitationModule } from "./types";

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

export async function getTemplateById(id: string): Promise<Template | null> {
  try {
    const snap = await getDoc(doc(serverDb, "templates", id));
    if (!snap.exists()) return null;
    const data = snap.data() as Template;
    if (!data.active) return null;
    return data;
  } catch (err) {
    // La regla "resource.data.active == true" deniega docs inexistentes/inactivas
    // como error de permisos; se trata igual que "no encontrada".
    if (isFirestorePermissionError(err)) return null;
    throw err;
  }
}

function isFirestorePermissionError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "permission-denied"
  );
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  const q = query(
    collection(serverDb, "invitations"),
    where("status", "==", "published")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as any).slug as string);
}

// Config por defecto para nuevas páginas
export function defaultBuilderConfig(): BuilderConfig {
  return {
    modules: [] as any[],
    theme: {
      primaryColor: "#D4AF37",
      background: "#FFFDF8",
      fontFamily: "serif",
    },
  };
}
