// ============================================================================
// LAYOUT /i/[slug] - Páginas públicas de invitación.
// Oculta la cabecera del sitio (vía SiteHeader) y añade el pie de Invify.
// ============================================================================
import { InvifyFooter } from "@/components/layout/InvifyFooter";

export default function PublicInvitationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <InvifyFooter />
    </div>
  );
}
