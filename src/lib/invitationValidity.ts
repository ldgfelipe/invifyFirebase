// ============================================================================
// VIGENCIA DE INVITACIONES
// La fecha del evento se toma del módulo "countdown" (targetDate) del builder.
// La invitación es válida hasta el día del evento; 1 día después se despublica.
// Helpers puros (sin Firebase) para poder usarse en servidor y cliente.
// ============================================================================
import type { Invitation } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

type BuilderLike = Pick<Invitation, "builderConfig">;

/** Parsea "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss" como fecha local. */
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, y, mo, d] = match;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** Fecha del evento (primer módulo countdown con targetDate). */
export function getInvitationEventDate(inv: BuilderLike): Date | null {
  const modules = inv?.builderConfig?.modules ?? [];
  const countdown = modules.find((m) => m.type === "countdown");
  if (countdown?.type !== "countdown" || !countdown.targetDate) return null;
  return parseLocalDate(countdown.targetDate);
}

/**
 * Momento en que expira la vigencia: inicio del día siguiente al evento.
 * Ej.: evento 2026-12-12 → expira 2026-12-13 00:00 (hora local).
 * Devuelve null si la invitación no tiene fecha de evento.
 */
export function getInvitationExpiry(inv: BuilderLike): number | null {
  const eventDate = getInvitationEventDate(inv);
  if (!eventDate) return null;
  const startOfEventDay = new Date(eventDate);
  startOfEventDay.setHours(0, 0, 0, 0);
  return startOfEventDay.getTime() + DAY_MS;
}

/** ¿La invitación ya superó su vigencia? (false si no tiene fecha de evento). */
export function isInvitationExpired(inv: BuilderLike, now: number = Date.now()): boolean {
  const expiry = getInvitationExpiry(inv);
  return expiry !== null && now >= expiry;
}

/** ¿La invitación sigue activa (dentro de vigencia)? */
export function isInvitationActive(inv: BuilderLike, now: number = Date.now()): boolean {
  return !isInvitationExpired(inv, now);
}
