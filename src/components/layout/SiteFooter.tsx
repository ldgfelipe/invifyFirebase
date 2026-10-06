// ============================================================================
// SITE FOOTER - Pie de página principal (no se muestra en /i/[slug])
// Incluye logo, enlaces, aviso privacidad, contacto, copyright dinámico y crédito ldgbehance
// ============================================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/i/")) return null;
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-cream border-t border-ink/10">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Marca */}
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-invify.png" alt="Invify" className="h-10 w-auto object-contain brightness-0 invert" />
            <p className="text-sm text-cream/70 leading-relaxed">
              Invitaciones digitales que se sienten como el evento. Diseño editorial, tipografía con intención.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-cream/10 flex items-center justify-center hover:bg-gold-500 transition text-sm">
                wa
              </a>
              <a href="mailto:contacto@invify.online" className="w-8 h-8 rounded-full bg-cream/10 flex items-center justify-center hover:bg-gold-500 transition text-sm">
                @
              </a>
            </div>
          </div>

          {/* Explora */}
          <div>
            <h4 className="font-medium text-cream mb-3">Explora</h4>
            <ul className="space-y-2 text-sm text-cream/70">
              <li>
                <Link href="/templates" className="hover:text-gold-300 transition">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/templates/boda" className="hover:text-gold-300">
                  Bodas
                </Link>
              </li>
              <li>
                <Link href="/templates/cumpleanos" className="hover:text-gold-300">
                  Cumpleaños
                </Link>
              </li>
              <li>
                <Link href="/templates/babyshower" className="hover:text-gold-300">
                  Baby Shower
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-gold-300">
                  Planes y precios
                </Link>
              </li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="font-medium text-cream mb-3">Soporte</h4>
            <ul className="space-y-2 text-sm text-cream/70">
              <li>
                <Link href="/contacto" className="hover:text-gold-300">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/aviso-privacidad" className="hover:text-gold-300">
                  Aviso de privacidad
                </Link>
              </li>
              <li>
                <a href="mailto:contacto@invify.online" className="hover:text-gold-300">
                  contacto@invify.online
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <Newsletter />
        </div>

        <div className="mt-10 pt-6 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream/50">
          <p>
            © {year} Invify. Todos los derechos reservados.
          </p>
          <p>
            Sitio realizado por{" "}
            <a href="https://ldgfelipe.github.io/ldgbehance/#/" target="_blank" rel="noopener noreferrer" className="text-gold-300 hover:text-gold-200 underline">
              ldgbehance
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Alta en la lista de correo: ofertas, noticias y promociones.
 *
 * Va en el pie porque es la sección que se mira sin intención de compra, que es
 * justo cuando alguien se apunta a recibir novedades.
 *
 * El botón no se deshabilita mientras espera (un input que se bloquea hace que el
 * doble clic no dé error y parezca que no pasó nada): se muestra "Enviando…" y la
 * validación la hace el servidor, que además es quien deduplica.
 */
function Newsletter() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (estado === "enviando") return;
    setEstado("enviando");
    setMensaje("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar");
      setEstado("ok");
      setMensaje("¡Listo! Te avisaremos.");
      setEmail("");
    } catch (err: any) {
      setEstado("error");
      setMensaje(err.message ?? "No se pudo completar. Inténtalo de nuevo.");
    }
  }

  return (
    <div>
      <h4 className="font-medium text-cream mb-3">Novedades de Invify</h4>
      <p className="text-sm text-cream/70 mb-3">
        Ofertas, noticias y promociones. Solo escribimos cuando hay algo que contar.
      </p>

      <form onSubmit={enviar} noValidate>
        <div className="flex gap-2">
          <label htmlFor="newsletter-email" className="sr-only">
            Tu correo electrónico
          </label>
          <input
            id="newsletter-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="flex-1 min-w-0 rounded-lg bg-cream/10 border border-cream/20 px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:outline-none focus:border-gold-400"
          />
          <button
            type="submit"
            disabled={estado === "enviando"}
            className="btn-primary text-sm px-4 py-2 whitespace-nowrap disabled:opacity-60"
          >
            {estado === "enviando" ? "Enviando…" : "Suscribirme"}
          </button>
        </div>

        {mensaje && (
          <p
            role="status"
            className={`text-xs mt-2 ${estado === "ok" ? "text-gold-300" : "text-red-300"}`}
          >
            {mensaje}
          </p>
        )}
      </form>

      <p className="text-[11px] text-cream/40 mt-3 leading-relaxed">
        Al suscribirte aceptas el{" "}
        <Link href="/aviso-privacidad" className="underline hover:text-cream/60">
          aviso de privacidad
        </Link>
        . Puedes darte de baja en cualquier momento.
      </p>
    </div>
  );
}
