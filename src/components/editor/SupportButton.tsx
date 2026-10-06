// ============================================================================
// SUPPORT BUTTON - Boton flotante de soporte en el editor, encima del de la IA.
//
// Permite reportar un problema sin salir del editor, que es donde el cliente lo
// detecta: si tiene que abrir otra pestana para escribir, no lo escribe.
//
// El boton va en `bottom-24` porque el de la IA esta en `bottom-6` y mide 56px
// (h-14): su borde superior queda a 24+56 = 80px, asi que 96px deja 16px de
// separación. Si se moviera el boton de la IA habria que recalcular esto.
// ============================================================================
"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function SupportButton({
  invitationId,
  invitationTitle,
  selectedModule,
}: {
  invitationId: string;
  invitationTitle?: string;
  /** Tipo del modulo que el usuario tiene seleccionado, para acotar el reporte. */
  selectedModule?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (estado === "enviando") return;
    setEstado("enviando");
    setError("");
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          mensaje,
          invitacionId: invitationId,
          invitacionTitulo: invitationTitle,
          pagina: typeof window !== "undefined" ? window.location.pathname : undefined,
          modulo: selectedModule,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar");
      setEstado("ok");
      setMensaje("");
    } catch (err: any) {
      setEstado("error");
      setError(err.message ?? "No se pudo enviar. Inténtalo de nuevo.");
    }
  }

  function cerrar() {
    setOpen(false);
    // El error se borra al cerrar: si no, reaparece al reabrir y confunde.
    setEstado("idle");
    setError("");
  }

  return (
    <>
      {/* Boton flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 h-14 w-14 rounded-full bg-white text-ink shadow-lg border border-ink/10 hover:bg-champagne transition flex items-center justify-center text-xl"
        title="Reportar un problema"
        aria-label="Reportar un problema"
      >
        🎧
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-4"
          onClick={cerrar}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full p-6"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-title"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 id="support-title" className="font-serif text-xl text-ink">
                  Reportar un problema
                </h2>
                <p className="text-sm text-ink/60 mt-1">
                  Cuéntanos qué pasa y lo revisamos.
                </p>
              </div>
              <button
                onClick={cerrar}
                className="p-1 text-ink/40 hover:text-ink rounded"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {estado === "ok" ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-3">✅</p>
                <p className="text-ink/70 mb-4">
                  Gracias. Ya lo tenemos y te responderemos por correo.
                </p>
                <button onClick={cerrar} className="btn-primary px-6 py-2 text-sm">
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={enviar}>
                {/* Contexto automatico: el soporte sabe donde mirar sin preguntar */}
                <div className="text-xs text-ink/50 bg-ink/5 rounded-lg px-3 py-2 mb-3 space-y-0.5">
                  <p>
                    <span className="text-ink/40">Invitación:</span>{" "}
                    {invitationTitle || invitationId}
                  </p>
                  {selectedModule && (
                    <p>
                      <span className="text-ink/40">Módulo abierto:</span> {selectedModule}
                    </p>
                  )}
                </div>

                <label htmlFor="support-mensaje" className="sr-only">
                  Describe el problema
                </label>
                <textarea
                  id="support-mensaje"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  rows={5}
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="Por ejemplo: al mover el módulo de mapa la invitación se queda en blanco."
                  className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-gold-400"
                />

                <p className="text-[11px] text-ink/40 mt-1">
                  Entre 10 y 2000 caracteres.
                </p>

                {error && (
                  <p role="alert" className="text-xs text-red-600 mt-2">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={cerrar} className="btn-outline px-4 py-2 text-sm">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={estado === "enviando"}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {estado === "enviando" ? "Enviando…" : "Enviar reporte"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}