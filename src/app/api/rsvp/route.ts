// ============================================================================
// API /api/rsvp - Recibe confirmaciones públicas (sin login de invitado).
// Valida, aplica rate-limit e incrementa stats. Protegido por reglas Firestore.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { serverDb } from "@/lib/firebase/serverClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { isInvitationExpired } from "@/lib/invitationValidity";
import { getInvitationFeatures } from "@/lib/plans";
import type { Invitation, Rsvp } from "@/lib/types";

export async function POST(req: NextRequest) {
  // Rate-limit por IP.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkRateLimit("rsvp", ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { invitationId, nombre, email, personas } = body;
  if (!invitationId || typeof invitationId !== "string") {
    return NextResponse.json({ error: "invitationId requerido" }, { status: 400 });
  }
  if (!nombre || typeof nombre !== "string" || nombre.length > 120) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  if (!Number.isInteger(personas) || personas < 1 || personas > 20) {
    return NextResponse.json({ error: "Personas inválidas" }, { status: 400 });
  }

  // Verifica que la invitación exista, esté publicada y vigente.
  const invSnap = await getDoc(doc(serverDb, "invitations", invitationId));
  if (!invSnap.exists || (invSnap.data() as any).status !== "published") {
    return NextResponse.json({ error: "Invitación no disponible" }, { status: 404 });
  }
  if (isInvitationExpired(invSnap.data() as any)) {
    return NextResponse.json({ error: "La invitación ha finalizado" }, { status: 410 });
  }
  if (!getInvitationFeatures(invSnap.data() as Invitation).rsvp) {
    return NextResponse.json(
      { error: "El RSVP no está incluido en el plan de esta invitación" },
      { status: 403 }
    );
  }

  const rsvp: Rsvp = {
    nombre: nombre.trim(),
    email: typeof email === "string" ? email.trim() : "",
    personas,
    fecha: new Date().toISOString(),
    createdAt: Date.now(),
  };

  await addDoc(
    collection(serverDb, "invitations", invitationId, "rsvps"),
    rsvp
  );

  return NextResponse.json({ ok: true });
}
