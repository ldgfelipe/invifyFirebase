"use client";

// ============================================================================
// ADMIN LAYOUT - Protege todas las rutas /admin. Solo role=admin.
// El primer admin se define manualmente en Firestore (/users/{uid} role:"admin")
// o vía la cuenta de servicio. Las reglas de Firestore validan la escritura.
// ============================================================================
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/admin");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink/60">
        Cargando panel de administración…
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-serif text-3xl text-ink mb-2">Acceso restringido</h1>
        <p className="text-ink/60 mb-4">
          Necesitas permiso de administrador para ver esta sección.
        </p>
        <Link href="/" className="btn-outline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-ink/10 bg-white p-6 hidden sm:block">
        <Link href="/admin" className="font-serif text-2xl text-ink block mb-8">
          Invify <span className="text-gold-500">Admin</span>
        </Link>
        <nav className="space-y-2 text-sm">
          <AdminLink href="/admin" label="Resumen" />
          <AdminLink href="/admin/templates" label="Plantillas" />
          <AdminLink href="/admin/plans" label="Planes" />
          <AdminLink href="/admin/settings" label="Sitio / Landing" />
        </nav>
        <Link href="/" className="text-ink/50 text-sm mt-10 inline-block hover:text-gold-500">
          ← Ver sitio
        </Link>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-ink/70 hover:bg-gold-50 hover:text-gold-500"
    >
      {label}
    </Link>
  );
}
