// ============================================================================
// DASHBOARD LAYOUT - Estructura de /dashboard.
//
// Dinámico a propósito: antes se prerenderizaba como HTML estático y se servía
// desde la caché de Next sin pasar por el middleware, de modo que un
// rastreador recibía 200 con el shell del panel. Con force-dynamic cada
// petición se renderiza en el servidor y el middleware puede devolver 403 a
// los bots y marcar X-Robots-Tag.
//
// Los datos del panel los protegen las reglas de Firestore (ownerUid) y las
// APIs: /api/invitations/* comprueban la sesión en el servidor.
// ============================================================================
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
