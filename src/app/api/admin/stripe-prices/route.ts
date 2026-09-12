// ============================================================================
// API /api/admin/stripe-prices - Crea Price en Stripe y devuelve price_id
// Solo admin. Usa claves de SiteSettings (test/live según toggle).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Verificar admin
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "");
    if (!idToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists || (userSnap.data() as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { planName, amount, currency, interval, mode } = await req.json();
    if (!planName || !amount || !currency || !interval) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const stripe = await getStripe();
    const isTest = mode === "test";

    // 1. Crear Product en Stripe
    const product = await stripe.products.create({
      name: planName,
      metadata: { mode: isTest ? "test" : "live" },
    });

    // 2. Crear Price en Stripe
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount, // en centavos
      currency: currency.toLowerCase(),
      recurring: { interval },
      metadata: { mode: isTest ? "test" : "live" },
    });

    return NextResponse.json({
      priceId: price.id,
      productId: product.id,
      mode: isTest ? "test" : "live",
    });
  } catch (err: any) {
    console.error("[Create Stripe Price] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}