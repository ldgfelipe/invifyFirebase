"use client";

// ============================================================================
// AUTH WALL - Pantalla de login/registro que conserva la selección del usuario.
// Se muestra cuando un flujo requiere sesión (ej. elegir plantilla).
// ============================================================================
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

interface AuthWallProps {
  // Plantilla seleccionada que se conserva al iniciar sesión.
  onAuthenticated?: () => void;
  fallbackSlug?: string;
}

export function AuthWall({ onAuthenticated, fallbackSlug }: AuthWallProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      onAuthenticated?.();
    } catch (err: any) {
      setError(traducirError(err?.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8">
        <h1 className="font-serif text-3xl text-ink text-center mb-1">
          {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>
        <p className="text-center text-sm text-ink/60 mb-6">
          Tu selección se guardará automáticamente.
        </p>

        <button
          onClick={() => signInWithGoogle()}
          className="w-full mb-4 py-3 rounded-xl border border-gold/40 text-ink hover:bg-gold/10 transition"
        >
          Continuar con Google
        </button>

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
    default:
      return "Ocurrió un error. Inténtalo de nuevo.";
  }
}
