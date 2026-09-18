// ============================================================================
// INVIFY FOOTER - Pie de página para invitaciones públicas (/i/[slug]).
// Muestra el dominio de Invify, el mensaje de autoría y enlaza al inicio.
// ============================================================================
import Link from "next/link";
import { SITE_URL } from "@/lib/seo";

function getDomain(): string {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "invify";
  }
}

export function InvifyFooter() {
  const domain = getDomain();

  return (
    <footer className="border-t border-ink/10 bg-cream/90 py-6 text-center">
      <Link href="/" className="inline-block text-sm text-ink/60 hover:text-ink/80">
        Invitación creada por{" "}
        <span className="font-medium text-gold-500">Invify</span>
      </Link>
      <Link
        href="/"
        className="mt-1 block text-xs text-ink/40 hover:text-ink/60"
      >
        {domain}
      </Link>
    </footer>
  );
}
