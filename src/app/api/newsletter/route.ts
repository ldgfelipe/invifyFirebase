// ============================================================================
// API POST /api/newsletter - Alta en la lista de correo de Invify.
//
// Body: { email, source? }
// Guardar en adminDb.newsletter y avisar a contacto@invify.online.
//
// El doc ID es un hash del email normalizado, no un ID aleatorio: asi una persona
// que se suscribe dos veces ACTUALIZA su registro en vez de crear un duplicado, y
// el alta es idempotente sin tener que leer la coleccion entera.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Máximo de correos por persona antes de considerarlo spam. */
const MAX_POR_DIA = 5;

function esEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/** Minúsculas y sin espacios: "  Ana@Correo.COM " debe ser el mismo registro. */
function normalizar(email: string) {
  return email.trim().toLowerCase();
}

function idDe(email: string) {
  return createHash("sha256").update(email).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = normalizar(String(body.email ?? ""));
  const source = String(body.source ?? "footer").slice(0, 40);

  if (!email || email.length > 254 || !esEmail(email)) {
    return NextResponse.json({ error: "Escribe un correo válido" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";

  const limite = await checkRateLimit("newsletter", ip);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  const col = adminDb.collection("newsletter");
  const ref = col.doc(idDe(email));
  const previo = await ref.get();
  const ahora = Date.now();

  // Freno de spam: mismo correo muchas veces desde IPs distintas.
  const previoData = previo.data() as
    | { veces?: number; subscribedAt?: number }
    | undefined;
  const veces = previoData?.veces ?? 0;
  if (veces >= MAX_POR_DIA) {
    return NextResponse.json({ ok: true, yaSuscrito: true });
  }

  await ref.set(
    {
      email,
      source,
      // subscribedAt solo se escribe la primera vez: es la fecha real del alta
      // y no debe moverse cada vez que alguien repite el formulario.
      subscribedAt: previoData?.subscribedAt ?? ahora,
      updatedAt: ahora,
      veces: veces + 1,
      userAgent: req.headers.get("user-agent") ?? null,
      //utm/source de donde vino, por si se quiere medir la campaña
      status: "suscrito",
    },
    { merge: true }
  );

  if (!previo.exists) {
    console.log(`[newsletter] Nuevo alta: ${email} (${source})`);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}