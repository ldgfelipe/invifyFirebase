// ============================================================================
// SITE FOOTER - Pie de página principal (no se muestra en /i/[slug])
// Incluye logo, enlaces, aviso privacidad, contacto, copyright dinámico y crédito ldgbehance
// ============================================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

          {/* Newsletter / CTA */}
          <div>
            <h4 className="font-medium text-cream mb-3">¿Listo para crear?</h4>
            <p className="text-sm text-cream/70 mb-3">Elige una plantilla y personaliza en 3 clics.</p>
            <Link href="/templates" className="btn-primary text-sm px-4 py-2 inline-block">
              Ver plantillas
            </Link>
          </div>
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
