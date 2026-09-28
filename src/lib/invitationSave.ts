// ============================================================================
// Guardado de invitaciones con cupo post-publicación (cliente).
// Toda edición de contenido pasa por PATCH /api/invitations/[id] para que el
// servidor cuente los cambios. Lanza ExhaustedError si se acabaron los 2
// gratuitos: ahí la UI debe abrir el modal de solicitud a Invify.
// ============================================================================
import type { BuilderConfig } from "@/lib/types";

export class ExhaustedError extends Error {
  used: number;
  constructor(message: string, used: number) {
    super(message);
    this.name = "ExhaustedError";
    this.used = used;
  }
}

export interface SaveContentResult {
  ok: boolean;
  published: boolean;
  used: number;
  remaining: number;
}

export async function saveInvitationContent(
  invitationId: string,
  token: string,
  payload: { builderConfig: BuilderConfig; title?: string; slug?: string }
): Promise<SaveContentResult> {
  const res = await fetch(`/api/invitations/${invitationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ saveContent: payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && (data as any).exhausted) {
      throw new ExhaustedError(
        (data as any).error ?? "Agotaste los cambios gratuitos.",
        Number((data as any).used ?? 2)
      );
    }
    throw new Error((data as any).error ?? "No se pudo guardar");
  }
  return data as SaveContentResult;
}

export async function requestMoreChanges(
  invitationId: string,
  token: string,
  motivo: string
): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(`/api/invitations/${invitationId}/change-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ motivo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? "No se pudo enviar la solicitud");
  return data;
}
