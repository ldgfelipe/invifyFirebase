"use client";

// ============================================================================
// SITE HEADER - Barra de navegación global con estado de sesión.
// Muestra login/logout y un acceso al panel admin si el usuario es admin.
// ============================================================================
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl text-ink">
          Invify
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm text-ink/70">
          <Link href="/templates" className="hover:text-gold-500">
            Catálogo
          </Link>
          <Link href="/pricing" className="hover:text-gold-500">
            Planes
          </Link>
          {user && (
            <Link href="/dashboard" className="hover:text-gold-500 font-medium">
              Panel
            </Link>
          )}
          {profile?.role === "admin" && (
            <Link href="/admin" className="hover:text-gold-500">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden sm:inline text-sm text-ink/60">
                {profile?.displayName || user.email}
              </span>
              <button onClick={handleLogout} className="btn-outline text-sm px-3 py-2">
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm px-4 py-2">
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
