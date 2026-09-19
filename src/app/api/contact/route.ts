// ============================================================================
// API POST /api/contact - Guarda mensaje de contacto y notifica a contacto@invify.online
// Body: { nombre, email, telefono?, mensaje }
// Guarda en Firestore adminDb.contacts y envía email si hay RESEND_API_KEY o logea
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { LogHelper } from "@/lib/logging";

export const runtime = "nodejs";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const nombre = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();
  const mensaje = String(body.mensaje ?? "").trim();

  if (!nombre || nombre.length < 2 || nombre.length > 120) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  if (!email || !isEmail(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (!mensaje || mensaje.length < 10 || mensaje.length > 2000) {
    return NextResponse.json({ error: "Mensaje debe tener 10-2000 caracteres" }, { status: 400 });
  }

  const id = adminDb.collection("contacts").doc().id;
  const data = {
    id,
    nombre,
    email,
    telefono: telefono || null,
    mensaje,
    createdAt: Date.now(),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    status: "new" as const,
  };

  await adminDb.collection("contacts").doc(id).set(data);
  await LogHelper.webhookReceived("contact", id);

  // Intento de email a contacto@invify.online (best-effort)
  const to = "contacto@invify.online";
  const subject = `Nuevo contacto Invify: ${nombre}`;
  const text = `Nombre: ${nombre}\nEmail: ${email}\nTel: ${telefono || "-"}\n\nMensaje:\n${mensaje}\n\nID: ${id}`;
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Invify <noreply@invify.online>", to, subject, text }),
      });
    } else {
      console.log(`[contact] Nuevo mensaje para ${to}:`, text);
    }
  } catch (e) {
    console.warn("[contact] fallo envío email", e);
  }

  return NextResponse.json({ ok: true, id });
}

export async function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}
