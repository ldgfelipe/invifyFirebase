// ============================================================================
// INVIFY FOOTER - Pie de página para invitaciones públicas (/i/[slug]).
// Logo-h + mensaje crear tu propia invitación (target _blank)
// ============================================================================

export function InvifyFooter() {
  return (
    <footer className="border-t border-ink/10 bg-cream py-8 text-center">
      <div className="max-w-xl mx-auto px-6 space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-h.png" alt="Invify" className="h-8 w-auto mx-auto object-contain" />
        <p className="text-sm text-ink/70">
          También puedes crear tu propia invitación{" "}
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:text-gold-600 font-medium underline">
            da clic aquí
          </a>
        </p>
        <p className="text-xs text-ink/40">
          © {new Date().getFullYear()} Invify · Invitaciones digitales
        </p>
      </div>
    </footer>
  );
}
