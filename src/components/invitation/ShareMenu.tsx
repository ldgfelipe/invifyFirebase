"use client";

// ============================================================================
// Menú de compartir.
//
// El desplegable se monta en document.body con createPortal y se posiciona con
// coordenadas fijas calculadas del botón.
//
// Por qué el portal: el desplegable antes iba en posición absolute dentro del
// propio componente, y el botón se usa dentro de .card, que en globals.css
// lleva `overflow-hidden` para recortar las esquinas de la imagen. Eso recortaba
// el menú entero y las opciones de compartir quedaban invisibles sin aviso.
// Ningún cambio de z-index lo arregla: un ancestro con overflow oculto recorta
// siempre, por muy alto que sea el z-index. La única salida es sacar el nodo
// de ese ancestro.
// ============================================================================
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { invitationUrlRuntime, whatsappShareUrl, emailShareUrl } from "@/lib/seo";

type Props = {
  slug: string;
  title: string;
  variant?: "button" | "inline";
  className?: string;
};

/** Margen mínimo entre el desplegable y el borde de la ventana. */
const MARGEN = 8;

export function ShareMenu({ slug, title, variant = "button", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState<string>("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  /** Cierra el menú con Escape (accesibilidad de menús). */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Coloca el menú pegado al borde derecho del botón y, si no cabe debajo (p.ej.
   * el botón está al final de una tarjeta), lo abre hacia arriba.
   */
  const colocar = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const ancho = 224; // w-56
    const altoEstimado = 190; // url + 3 opciones + padding

    const top =
      r.bottom + 8 + altoEstimado > window.innerHeight - MARGEN
        ? Math.max(MARGEN, r.top - 8 - altoEstimado)
        : r.bottom + 8;

    // Alineado a la derecha del botón, corregido si se sale por la izquierda.
    let left = r.right - ancho;
    if (left < MARGEN) left = MARGEN;
    if (left + ancho > window.innerWidth - MARGEN) left = window.innerWidth - MARGEN - ancho;

    setPos({ top, left, width: ancho });
  }, []);

  // Medir antes de pintar: si se midiera en useEffect el menú aparecería primero
  // en (0,0) y saltaría de sitio.
  useLayoutEffect(() => {
    if (open) colocar();
  }, [open, colocar]);

  // Recalcular al desplazar o redimensionar: con position:fixed las coordenadas
  // quedan congeladas y el menú se despegaría del botón.
  useEffect(() => {
    if (!open) return;
    const recalc = () => colocar();
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open, colocar]);

  function getUrl(): string {
    // Runtime origin (donde se ejecuta) — requisito del usuario
    if (origin) return `${origin}/i/${slug}`;
    return invitationUrlRuntime(slug);
  }

  /** Cierra el menú solo si el clic fue fuera del botón y del propio menú. */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function handleCopy() {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback para navegadores sin permiso de portapapeles (http, Safari old).
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  }

  function handleWhatsApp() {
    window.open(whatsappShareUrl(`Te invito a ${title}`, getUrl()), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function handleEmail() {
    window.location.href = emailShareUrl(
      `Invitación: ${title}`,
      `¡Hola! Te invito a ver mi invitación:\n\n${title}\n${getUrl()}\n\n¡Te espero!`
    );
    setOpen(false);
  }

  if (variant === "inline") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <button onClick={handleCopy} className="btn-outline text-sm px-3 py-2">
          {copied ? "¡Copiado!" : "🔗 Copiar enlace"}
        </button>
        <button onClick={handleWhatsApp} className="btn-outline text-sm px-3 py-2">
          💬 WhatsApp
        </button>
        <button onClick={handleEmail} className="btn-outline text-sm px-3 py-2">
          ✉️ Correo
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="btn-outline text-sm px-3 py-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {copied ? "¡Copiado!" : "Compartir"}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed bg-white rounded-xl shadow-lg border border-ink/10 py-2 z-[60]"
          >
            <div className="px-3 pb-2 text-xs text-ink/50 truncate border-b border-ink/5 mb-1">
              {getUrl()}
            </div>
            <button
              role="menuitem"
              onClick={handleCopy}
              className="w-full text-left px-4 py-2 text-sm hover:bg-ink/5 flex items-center gap-2"
            >
              🔗 {copied ? "¡Copiado!" : "Copiar enlace"}
            </button>
            <button
              role="menuitem"
              onClick={handleWhatsApp}
              className="w-full text-left px-4 py-2 text-sm hover:bg-ink/5 flex items-center gap-2"
            >
              💬 Compartir por WhatsApp
            </button>
            <button
              role="menuitem"
              onClick={handleEmail}
              className="w-full text-left px-4 py-2 text-sm hover:bg-ink/5 flex items-center gap-2"
            >
              ✉️ Compartir por correo
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}