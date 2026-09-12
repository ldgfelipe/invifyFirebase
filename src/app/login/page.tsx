"use client";

// ============================================================================
// LOGIN (/login) - Acceso centralizado con Google o correo/contraseña.
// Conserva el destino original vía ?redirect= y ?template= para continuar el
// flujo de compra tras autenticarse.
// ============================================================================
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

function LoginInner() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGoogleRedirect } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const redirect = params.get("redirect") || "/dashboard";
  const template = params.get("template");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function goAfterAuth() {
    // Si venimos eligiendo plantilla, continuamos al pago conservándola.
    const dest =
      template && redirect === "/dashboard"
        ? `/pricing?template=${template}`
        : redirect;
    router.push(dest);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      // onAuthStateChanged en AuthContext detectará el cambio y redirigirá
      // goAfterAuth() se llama desde el listener de auth
    } catch (err: any) {
      setError(traducirError(err?.code));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      // Guardar redirect params antes del redirect
      if (template) sessionStorage.setItem("authTemplate", template);
      if (redirect !== "/dashboard") sessionStorage.setItem("authRedirect", redirect);
      await signInWithGoogle();
      goAfterAuth();
    } catch (err: any) {
      setError(traducirError(err?.code));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleRedirect() {
    setError(null);
    setBusy(true);
    try {
      // Guardar redirect params antes del redirect
      if (template) sessionStorage.setItem("authTemplate", template);
      if (redirect !== "/dashboard") sessionStorage.setItem("authRedirect", redirect);
      await signInWithGoogleRedirect();
    } catch (err: any) {
      setError(traducirError(err?.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8">
        <Link href="/" className="font-serif text-2xl text-ink block text-center mb-1">
          Invify
        </Link>
        <h1 className="text-center font-serif text-2xl text-ink mb-6">
          {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full mb-4 py-3 rounded-xl border border-gold-300 text-ink hover:bg-gold-50 transition"
        >
          Continuar con Google
        </button>

        <p className="text-center text-xs text-ink/50 mb-4">
          ¿El popup se cierra?{" "}
          <button
            type="button"
            onClick={() => {
              setBusy(true);
              signInWithGoogleRedirect().finally(() => setBusy(false));
            }}
            disabled={busy}
            className="text-gold-500 underline hover:text-gold-600"
          >
            Usar redirección
          </button>
        </p>

        <div className="flex items-center gap-3 my-4 text-ink/40 text-xs">
          <div className="h-px flex-1 bg-ink/10" />
          o
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <input
              className="input"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className="input"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className={cn("btn-primary w-full", busy && "opacity-60")}
          >
            {busy ? "Procesando..." : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>

        <p className="text-center text-sm mt-4 text-ink/70">
          {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            className="text-gold-500 underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}

function traducirError(code?: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Este correo ya está registrado.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Correo o contraseña incorrectos.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/popup-closed-by-user":
      return "Ventana de Google cerrada. Inténtalo de nuevo.";
    default:
      return "Ocurrió un error. Inténtalo de nuevo.";
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-ink/60">Cargando…</div>}>
      <LoginInner />
    </Suspense>
  );
}
