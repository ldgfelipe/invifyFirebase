"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", mensaje: "" });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setMsg("¡Gracias! Tu mensaje fue enviado. Te contactaremos en 24h.");
      setForm({ nombre: "", email: "", telefono: "", mensaje: "" });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <label className="text-sm text-ink/70">Nombre *</label>
        <input className="input mt-1" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Tu nombre" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-ink/70">Email *</label>
          <input className="input mt-1" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@correo.com" />
        </div>
        <div>
          <label className="text-sm text-ink/70">Teléfono</label>
          <input className="input mt-1" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+52 ..." />
        </div>
      </div>
      <div>
        <label className="text-sm text-ink/70">Mensaje *</label>
        <textarea className="input mt-1 min-h-[120px]" required value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} placeholder="Cuéntanos en qué te ayudamos..." />
      </div>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      <button type="submit" disabled={sending} className="btn-primary w-full">
        {sending ? "Enviando..." : "Enviar mensaje"}
      </button>
      <p className="text-xs text-ink/40 text-center">
        Al enviar aceptas nuestro <a href="/aviso-privacidad" className="underline hover:text-gold-500">aviso de privacidad</a>.
      </p>
    </form>
  );
}
