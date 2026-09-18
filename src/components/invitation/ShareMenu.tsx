"use client";

import { useState, useEffect, useRef } from "react";
import { invitationUrlRuntime, whatsappShareUrl, emailShareUrl } from "@/lib/seo";

type Props = {
  slug: string;
  title: string;
  variant?: "button" | "inline";
  className?: string;
};

export function ShareMenu({ slug, title, variant = "button", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function getUrl(): string {
    // Runtime origin (donde se ejecuta) — requisito del usuario
    if (origin) return `${origin}/i/${slug}`;
    return invitationUrlRuntime(slug);
  }

  async function handleCopy() {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleWhatsApp() {
    const url = getUrl();
    window.open(whatsappShareUrl(`Te invito a ${title}`, url), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function handleEmail() {
    const url = getUrl();
    const subject = `Invitación: ${title}`;
    const body = `¡Hola! Te invito a ver mi invitación:\n\n${title}\n${url}\n\n¡Te espero!`;
    window.location.href = emailShareUrl(subject, body);
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
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-outline text-sm px-3 py-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {copied ? "¡Copiado!" : "Compartir"}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-ink/10 py-2 z-20">
          <div className="px-3 pb-2 text-xs text-ink/50 truncate border-b border-ink/5 mb-1">{getUrl()}</div>
          <button
            onClick={handleCopy}
            className="w-full text-left px-4 py-2 text-sm hover:bg-ink/5 flex items-center gap-2"
          >
            🔗 {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <button
            onClick={handleWhatsApp}
            className="w-full text-left px-4 py-2 text-sm hover:bg-ink/5 flex items-center gap-2"
          >
            💬 Compartir por WhatsApp
          </button>
          <button
            onClick={handleEmail}
            className="w-full text-left px-4 py-2 text-sm hover:bg-ink/5 flex items-center gap-2"
          >
            ✉️ Compartir por correo
          </button>
        </div>
      )}
    </div>
  );
}
