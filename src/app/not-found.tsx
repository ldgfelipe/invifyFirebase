import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-cream">
      <p className="font-serif text-6xl text-gold-500">404</p>
      <h1 className="font-serif text-3xl text-ink mt-2">Página no encontrada</h1>
      <p className="text-ink/60 mt-2">
        La invitación o página que buscas no existe.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Ir al inicio
      </Link>
    </div>
  );
}
