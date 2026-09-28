// ============================================================================
// ChangeRequestModal — cuando se agotan los 2 cambios post-publicación, el
// cliente detalla el motivo y solicita permiso a Invify.
// ============================================================================
"use client";

import { useState } from "react";
import { requestMoreChanges } from "@/lib/invitationSave";

export function ChangeRequestModal({
  invitationId,
  getToken,
  invitationTitle,
  onClose,
  onSent,
}: {
  invitationId: string;
  getToken: () => Promise<string>;
  invitationTitle: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (motivo.trim().length < 10 || sending) return;
    setSending(true);
    setError(null);
    try {
      const token = await getToken();
      await requestMoreChanges(invitationId, token, motivo.trim());
      onSent();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="font-serif text-xl text-ink">Solicitar más cambios</h3>
        <p className="text-sm text-ink/60 mt-2">
          <strong>{invitationTitle}</strong> ya usó sus 2 cambios gratuitos tras publicar.
          Cuéntanos el motivo y el equipo Invify lo revisará (al aprobarse se regalan 2 cambios más).
        </p>
        <textarea
          className="input mt-4 h-28 text-sm"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Cambió la fecha del evento y necesito actualizarla… (mínimo 10 caracteres)"
          maxLength={500}
        />
        <p className="text-xs text-ink/40 mt-1 text-right">{motivo.trim().length}/500</p>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button
            onClick={send}
            disabled={sending || motivo.trim().length < 10}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {sending ? "Enviando…" : "Enviar solicitud"}
          </button>
          <button onClick={onClose} disabled={sending} className="btn-outline">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
