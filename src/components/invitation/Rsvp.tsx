"use client";

// ============================================================================
// RSVP - Formulario público de confirmación (sin login de invitado).
// Envía a /api/rsvp con rate-limit en servidor.
// ============================================================================
import { useState } from "react";
import type { RsvpModule } from "@/lib/types";

export function RsvpForm({
  module,
  invitationId,
  demo = false,
}: {
  module: RsvpModule;
  invitationId: string;
  demo?: boolean;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [personas, setPersonas] = useState(1);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    if (demo) {
      // Modo demo: no se guarda una confirmación real.
      setStatus("ok");
      setMsg("Vista previa: aquí tus invitados confirmarían su asistencia.");
      return;
    }
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, nombre, email, personas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setStatus("ok");
      setMsg("¡Gracias! Tu asistencia ha sido confirmada.");
      setNombre("");
      setEmail("");
      setPersonas(1);
    } catch (err: any) {
      setStatus("error");
      setMsg(err.message ?? "No pudimos enviar tu respuesta.");
    }
  }

  return (
    <section className="py-14 px-6 max-w-xl mx-auto">
      <h2 className="section-title text-center">{module.title}</h2>
      <form onSubmit={submit} className="card p-6 mt-6 space-y-4">
        <input
          className="input"
          placeholder="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          maxLength={120}
        />
        {module.collectEmail && (
          <input
            className="input"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}
        <div>
          <label className="text-sm text-ink/70">¿Cuántas personas asisten?</label>
          <input
            className="input mt-1"
            type="number"
            min={1}
            max={20}
            value={personas}
            onChange={(e) => setPersonas(Number(e.target.value))}
            required
          />
        </div>
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-primary w-full"
        >
          {status === "sending" ? "Enviando..." : "Confirmar asistencia"}
        </button>
        {msg && (
          <p className={status === "ok" ? "text-gold-500 text-sm" : "text-red-600 text-sm"}>
            {msg}
          </p>
        )}
      </form>
    </section>
  );
}
