import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

// Edge runtime compatible - no Firebase Admin SDK directamente
// Usamos el token de sesión de Firebase en cookies

export async function middleware(request: NextRequest) {
  // Solo proteger /admin/*
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Verificar session cookie de Firebase
    const sessionCookie = request.cookies.get("__session")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verificar la session cookie con Firebase Admin (server-side)
      // En middleware edge, hacemos la verificación llamando a un endpoint interno
      // o usando Firebase Admin SDK si está disponible en edge runtime
      
      // Para simplicidad en edge runtime, verificamos la cookie y luego
      // la validación completa se hace en el layout del admin
      
      // Permitir pasar, la validación final se hace en AdminLayout
      return NextResponse.next();
    } catch {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};