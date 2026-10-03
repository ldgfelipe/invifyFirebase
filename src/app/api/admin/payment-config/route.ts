// ============================================================================
// API /api/admin/payment-config
// Gestiona las credenciales SECRETAS de Stripe, PayPal y Mercado Pago, que
// viven en /paymentConfig/default (coleccion privada, solo admin).
//
// GET  -> nunca devuelve claves en claro: solo si cada campo existe y una
//         mascara del tipo "sk_live_...lTN".
// PATCH-> guarda solo los campos enviados en el body. Los campos ausentes o
//         vacios se conservan intactos, de modo que el panel puede enviar solo
//         la clave que el admin acaba de escribir.
//
// Este documento antes vivia en /site/config, que tiene "allow read: if true"
// porque el landing lo lee con el SDK web. Eso permitia leer todas las claves
// secretas desde Firestore sin autenticacion.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import type { PaymentSecrets } from "@/lib/types";

export const runtime = "nodejs";

const COLLECTION = "paymentConfig";
const DOC_ID = "default";

/** Solo estos campos son escribibles. Cualquier otro se descarta. */
const ALLOWED_FIELDS = [
  "stripeTestSecretKey",
  "stripeTestWebhookSecret",
  "stripeLiveSecretKey",
  "stripeLiveWebhookSecret",
  "paypalTestSecret",
  "paypalLiveSecret",
  "mercadopagoTestAccessToken",
  "mercadopagoTestWebhookSecret",
  "mercadopagoLiveAccessToken",
  "mercadopagoLiveWebhookSecret",
] as const satisfies ReadonlyArray<keyof PaymentSecrets>;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

function isAllowedField(k: string): k is AllowedField {
  return (ALLOWED_FIELDS as ReadonlyArray<string>).includes(k);
}

async function verifyAdmin(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace("Bearer ", "");
  if (!idToken) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists || (userSnap.data() as { role?: string }).role !== "admin") return null;
    return uid;
  } catch {
    return null;
  }
}

/** "sk_live_51ABC...lTN" -> nunca la clave completa. */
function mask(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  const prefix = value.slice(0, 10);
  return `${prefix}${"*".repeat(8)}${value.slice(-4)}`;
}

function statusOf(data: Record<string, unknown>): Record<string, { set: boolean; masked: string }> {
  const out: Record<string, { set: boolean; masked: string }> = {};
  for (const field of ALLOWED_FIELDS) {
    const raw = data[field];
    const set = typeof raw === "string" && raw.length > 0;
    out[field] = { set, masked: set ? mask(raw) : "" };
  }
  return out;
}

export async function GET(req: NextRequest) {
  const uid = await verifyAdmin(req);
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const snap = await adminDb.collection(COLLECTION).doc(DOC_ID).get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
  return NextResponse.json({ secrets: statusOf(data) });
}

export async function PATCH(req: NextRequest) {
  const uid = await verifyAdmin(req);
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const incoming = body as Record<string, unknown>;
  const ref = adminDb.collection(COLLECTION).doc(DOC_ID);

  // Solo se guardan los campos permitidos con valor no vacío.
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!isAllowedField(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    patch[key] = trimmed;
  }

  const updated: string[] = [];
  if (Object.keys(patch).length > 0) {
    await ref.set(patch, { merge: true });
    updated.push(...Object.keys(patch));
  }

  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};

  await adminDb.collection("logs").add({
    action: "payment_config.updated",
    userId: uid,
    targetId: `${COLLECTION}/${DOC_ID}`,
    targetType: "settings",
    metadata: { fields: updated },
    description: updated.length
      ? `Admin actualizó credenciales: ${updated.join(", ")}`
      : "Admin guardó settings sin cambios de credenciales",
    severity: "warn",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, updated, secrets: statusOf(data) });
}