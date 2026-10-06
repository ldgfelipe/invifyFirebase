// ============================================================================
// API POST /api/support - Reporte de un problema desde el editor.
//
// Body: { mensaje, invitacionId?, invitacionTitulo?, pagina?, modulo? }
//
// Exige sesión y que la invitación sea del que la reporta: sin esas dos
// comprobaciones, cualquiera podría abrir la pestaña de red y meter tickets
// ajenos. El ID de la invitación y el tipo de módulo viajan en el cuerpo a
// propósito, para que el soporte sepa dónde mirar sin tener que adivinarlo.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MIN_MENSAJE = 10;
const MAX_MENSAJE = 2000;

export async function POST(req: NextRequest) {
  // Sesion obligatoria.
  const raw = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!raw) return NextResponse.json({ error: "Inicia sesión para reportar" }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(raw)).uid;
  } catch {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  let body: {
    mensaje?: string;
    invitacionId?: string;
    invitacionTitulo?: string;
    pagina?: string;
    modulo?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const mensaje = String(body.mensaje ?? "").trim();
  if (mensaje.length < MIN_MENSAJE || mensaje.length > MAX_MENSAJE) {
    return NextResponse.json(
      { error: `Describe el problema entre ${MIN_MENSAJE} y ${MAX_MENSAJE} caracteres` },
      { status: 400 }
    );
  }

  const invitacionId = String(body.invitacionId ?? "").slice(0, 64);

  // Si se manda invitación, tiene que ser del propio usuario.
  if (invitacionId) {
    const inv = await adminDb.collection("invitations").doc(invitacionId).get();
    if (!inv.exists || inv.data()?.ownerUid !== uid) {
      return NextResponse.json({ error: "Esa invitación no es tuya" }, { status: 403 });
    }
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  const limite = await checkRateLimit("support", ip);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "Has enviado varios reportes seguidos. Espera unos minutos." },
      { status: 429 }
    );
  }

  const ref = adminDb.collection("supportTickets").doc();
  await ref.set({
    uid,
    mensaje,
    invitacionId: invitacionId || null,
    invitacionTitulo: String(body.invitacionTitulo ?? "").slice(0, 120) || null,
    pagina: String(body.pagina ?? "").slice(0, 200) || null,
    modulo: String(body.modulo ?? "").slice(0, 60) || null,
    status: "abierto",
    createdAt: Date.now(),
    userAgent: req.headers.get("user-agent") ?? null,
  });

  console.log(`[support] Reporte ${ref.id} de ${uid}`);
  return NextResponse.json({ ok: true, id: ref.id });
}

export async function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}