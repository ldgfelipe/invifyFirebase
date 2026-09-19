import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Invify",
  description: "Aviso de privacidad de Invify - cómo tratamos tus datos personales.",
  alternates: { canonical: "/aviso-privacidad" },
};

export default function AvisoPage() {
  const year = new Date().getFullYear();
  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="section-title">Aviso de privacidad</h1>
      <p className="text-sm text-ink/50 mb-6">Última actualización: {year}</p>
      <div className="card p-6 prose prose-sm max-w-none text-ink/80 space-y-4">
        <p>
          En <strong>Invify</strong> (contacto@invify.online) respetamos tu privacidad. Este aviso describe cómo recabamos, usamos y protegemos tus datos personales conforme a la LFPDPPP (México).
        </p>
        <h3 className="font-serif text-lg text-ink">1. Datos que recabamos</h3>
        <p>Nombre, email, teléfono y mensaje del formulario de contacto; datos de cuenta (email, displayName) y de invitaciones (título, slug, invitados vía RSVP/quiz).</p>
        <h3 className="font-serif text-lg text-ink">2. Finalidades</h3>
        <p>Crear y entregar invitaciones digitales, gestionar RSVP/quiz, soporte, facturación y envío de comunicaciones relacionadas con tu compra. Previo consentimiento, mailing con novedades.</p>
        <h3 className="font-serif text-lg text-ink">3. Transferencias</h3>
        <p>No vendemos tus datos. Solo compartimos con proveedores necesarios (Firebase/Google Cloud, Stripe/PayPal/Mercado Pago para pagos, y servicio de email).</p>
        <h3 className="font-serif text-lg text-ink">4. Derechos ARCO</h3>
        <p>Puedes solicitar acceso, rectificación, cancelación u oposición escribiendo a <a href="mailto:contacto@invify.online" className="text-gold-500 hover:underline">contacto@invify.online</a>.</p>
        <h3 className="font-serif text-lg text-ink">5. Cookies y rastreadores</h3>
        <p>Usamos cookies esenciales y, con tu consentimiento, píxeles de marketing (Meta, Google) configurables en el panel admin. Puedes desactivarlos en tu navegador.</p>
        <h3 className="font-serif text-lg text-ink">6. Conservación</h3>
        <p>Los datos de contacto se conservan hasta 2 años; las invitaciones hasta que las elimines o venza su vigencia (+ gracia 30 días).</p>
        <h3 className="font-serif text-lg text-ink">7. Cambios</h3>
        <p>Publicaremos cambios en esta misma URL.</p>
        <p className="pt-4">
          <Link href="/contacto" className="text-gold-500 hover:underline">
            ¿Dudas? Contáctanos
          </Link>
        </p>
      </div>
    </div>
  );
}
