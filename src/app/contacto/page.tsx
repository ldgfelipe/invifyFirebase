import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto | Invify",
  description: "Contáctanos para dudas, soporte o colaboraciones. Escríbenos a contacto@invify.online",
  alternates: { canonical: "/contacto" },
};

import ContactForm from "./ContactForm";

export default function ContactoPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="section-title text-center">Contacto</h1>
      <p className="text-center text-ink/60 mb-8">
        ¿Dudas, soporte o quieres una invitación a medida? Escríbenos y te respondemos en 24h.
      </p>
      <div className="card p-6 mb-6 bg-ink/5">
        <p className="text-sm text-ink/70">
          <strong>Email:</strong> <a href="mailto:contacto@invify.online" className="text-gold-500 hover:underline">contacto@invify.online</a> · <strong>Horario:</strong> Lun-Vie 9:00-18:00 (MX)
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
