// ============================================================================
// ADMIN LAYOUT - Estructura de /admin.
//
// Se declara dinámico a propósito: antes estas rutas se prerenderizaban como
// HTML estático (○ Static) y se servían desde la caché de Next, sin pasar por
// el middleware, así que un rastreador recibía 200 con el shell del panel.
// Con force-dynamic cada petición se renderiza en el servidor y el middleware
// puede devolver 403 a los bots y marcar X-Robots-Tag.
//
// La sesión y el rol se validan en AdminShell (cliente) y, sobre todo, en las
// reglas de Firestore y en las APIs de /api/admin.
// ============================================================================
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
