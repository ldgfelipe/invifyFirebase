// ============================================================================
// RATE LIMIT - Protección de formularios públicos (RSVP / Quiz)
// Implementación basada en Firestore: cuenta intentos recientes por IP.
// Evita spam sin necesidad de Redis. Ajusta WINDOW_MS y MAX_REQUESTS.
// ============================================================================
import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_REQUESTS = 10; // máximo de envíos por IP en la ventana

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Registra un intento y devuelve si está permitido.
 * @param bucket nombre de la colección de límites (ej. "rsvp" | "quiz")
 * @param ip dirección IP del cliente
 */
export async function checkRateLimit(
  bucket: string,
  ip: string
): Promise<RateLimitResult> {
  const col = adminDb.collection("rateLimits").doc(bucket).collection("hits");
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Limpia hits antiguos y cuenta los recientes.
  const recent = await col.where("ts", ">", cutoff).get();
  for (const d of recent.docs) {
    if ((d.data().ts as number) <= cutoff) {
      await d.ref.delete().catch(() => {});
    }
  }

  if (recent.size >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  await col.add({ ts: now, ip, createdAt: FieldValue.serverTimestamp() });
  return { allowed: true, remaining: MAX_REQUESTS - recent.size - 1 };
}
