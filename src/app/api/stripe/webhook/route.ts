// ============================================================================
// API /api/stripe/webhook - Admite compatibilidad con la URL registrada en el
// Dashboard de Stripe. Reenvía el evento (con headers y firma) al webhook
// unificado /api/payments/webhook/stripe que procesa con la capa multi-provider.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.set("content-type", "application/json");
  forwardHeaders.set("stripe-signature", signature);
  // El webhook unificado detecta el modo por estas cabeceras opcionales.
  if (!forwardHeaders.has("x-invify-mode")) {
    forwardHeaders.set(
      "x-invify-mode",
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "live" : "test"
    );
  }

  const url = new URL(req.url);
  const target = new URL("/api/payments/webhook/stripe", url.origin);

  const res = await fetch(target, {
    method: "POST",
    headers: forwardHeaders,
    body: rawBody,
  });

  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: res.headers });
}