"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, profile, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink/60">
        Cargando panel…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink/10 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl text-ink">
            Invify <span className="text-gold-500">·</span> Panel
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/templates" className="text-ink/70 hover:text-gold-500">
              Catálogo
            </Link>
            <Link href="/pricing" className="text-ink/70 hover:text-gold-500">
              Planes
            </Link>
            <Link href="/dashboard/profile" className="text-ink/70 hover:text-gold-500 flex items-center gap-1">
              <span className="hidden sm:inline">Perfil</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}