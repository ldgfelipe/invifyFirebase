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
  // No forzar x-invify-mode aquí: el handler unificado prueba test/live automáticamente
  // y además respeta ?mode=live|test si Stripe está configurado con ese query param.

  const url = new URL(req.url);
  const target = new URL("/api/payments/webhook/stripe", url.origin);
  // Preserva ?mode si viene en la URL original (recomendado: configurar webhook live con ?mode=live)
  if (url.searchParams.has("mode")) {
    target.searchParams.set("mode", url.searchParams.get("mode")!);
  }

  const res = await fetch(target, {
    method: "POST",
    headers: forwardHeaders,
    body: rawBody,
  });

  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: res.headers });
}