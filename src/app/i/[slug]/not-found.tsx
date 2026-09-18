// ============================================================================
// NOT FOUND /i/[slug] - Invitación inexistente, despublicada o finalizada.
// En lugar del 404 genérico, ofrece un enlace al sitio principal de Invify.
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

export default function InvitationNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center px-6 py-20 bg-cream">
      <p className="font-serif text-4xl text-gold-500">Invify</p>
      <h1 className="font-serif text-3xl text-ink mt-4">
        Esta invitación no está disponible
      </h1>
      <p className="text-ink/60 mt-2 max-w-md">
        El enlace no existe o la invitación ya finalizó. Puedes visitar
        nuestro sitio para conocer más.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Ir al sitio principal
      </Link>
      <Link
        href="/"
        className="mt-3 text-xs text-ink/40 hover:text-ink/60"
      >
        {getDomain()}
      </Link>
    </div>
  );
}
