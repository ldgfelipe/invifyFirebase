// ============================================================================
// API /api/quiz - Recibe respuestas del quiz interactivo (público, sin login).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { serverDb } from "@/lib/firebase/serverClient";
import { checkRateLimit } from "@/lib/rateLimit";
import type { QuizResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkRateLimit("quiz", ip);
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

  const { invitationId, datos } = body;
  if (!invitationId || typeof invitationId !== "string") {
    return NextResponse.json({ error: "invitationId requerido" }, { status: 400 });
  }
  if (!datos || typeof datos !== "object") {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  const invSnap = await getDoc(doc(serverDb, "invitations", invitationId));
  if (!invSnap.exists || (invSnap.data() as any).status !== "published") {
    return NextResponse.json({ error: "Invitación no disponible" }, { status: 404 });
  }

  const response: QuizResponse = {
    fecha: new Date().toISOString(),
    datos: datos as Record<string, string>,
    createdAt: Date.now(),
  };

  await addDoc(
    collection(serverDb, "invitations", invitationId, "quizResponses"),
    response
  );

  return NextResponse.json({ ok: true });
}
