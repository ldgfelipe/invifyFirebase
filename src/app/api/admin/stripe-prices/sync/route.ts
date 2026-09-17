// ============================================================================
// API /api/admin/stripe-prices/sync
// Crea o actualiza en un solo paso: (1) el Product y Price en Stripe para los
// modos con clave configurada (test/live) y (2) el documento del plan en
// Firestore, guardando automáticamente los price/product IDs.
// Es idempotente: si el price ya existe con el mismo monto/moneda/intervalo,
// lo reutiliza; si cambió, crea uno nuevo y archiva el anterior.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

async function verifyAdmin(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace("Bearer ", "");
  if (!idToken) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists || (userSnap.data() as any).role !== "admin") return null;
    return uid;
  } catch {
    return null;
  }
}

async function getStripeFor(mode: "test" | "live"): Promise<Stripe | null> {
  const siteSnap = await adminDb.collection("site").doc("config").get();
  const settings = siteSnap.exists ? (siteSnap.data() as any) : {};
  const key =
    mode === "test" ? settings.stripeTestSecretKey : settings.stripeLiveSecretKey;
  if (!key) {
    // Fallback a env cuando no hay clave en SiteSettings.
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return null;
    const isLive = secret.startsWith("sk_live");
    if ((mode === "test" && isLive) || (mode === "live" && !isLive)) return null;
    return new Stripe(secret, { apiVersion: "2023-10-16" });
  }
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

async function priceMatches(
  stripe: Stripe,
  priceId: string,
  amount: number,
  currency: string,
  interval: string
): Promise<boolean> {
  try {
    const p = await stripe.prices.retrieve(priceId);
    if (!p.active) return false;
    if (p.unit_amount !== amount) return false;
    if (p.currency !== currency) return false;
    const isOneTime = !interval || interval === "one_time";
    const actualInterval = p.recurring?.interval ?? null;
    if (isOneTime) return actualInterval === null;
    return actualInterval === interval;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const uid = await verifyAdmin(req);
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await req.json();
    const { planId, name, price, currency = "mxn", interval = "one_time", features = [] } = body;

    if (!planId || !name || !price) {
      return NextResponse.json({ error: "planId, name y price son obligatorios" }, { status: 400 });
    }

    const isOneTime = !interval || interval === "one_time";

    const planRef = adminDb.collection("plans").doc(planId);
    const planSnap = await planRef.get();
    const existing = planSnap.exists ? (planSnap.data() as any) : {};

    const syncResults: Record<string, { productId: string; priceId: string; created: boolean }> = {};
    const modes: Array<"test" | "live"> = [];
    for (const mode of ["test", "live"] as const) {
      const stripe = await getStripeFor(mode);
      if (stripe) modes.push(mode);
    }

    for (const mode of modes) {
      const stripe = (await getStripeFor(mode))!;
      const productField = mode === "test" ? "stripeProductIdTest" : "stripeProductIdLive";
      const priceField = mode === "test" ? "stripePriceIdTest" : "stripePriceIdLive";

      // 1. Product: crear si no existe, actualizar nombre si ya existe.
      let productId = existing[productField];
      if (productId) {
        try {
          await stripe.products.update(productId, { name });
        } catch {
          productId = undefined;
        }
      }
      if (!productId) {
        const product = await stripe.products.create({
          name,
          metadata: { mode, planId },
        });
        productId = product.id;
      }
      await planRef.set({ [productField]: productId }, { merge: true });

      // 2. Price: reutilizar si coincide, crear nuevo si no, archivar el viejo.
      let priceId = existing[priceField];
      let created = false;
      if (priceId && (await priceMatches(stripe, priceId, price, currency.toLowerCase(), interval))) {
        // Reusar price existente (solo actualizar metadata del product ya hecho).
      } else {
        if (priceId) {
          try {
            await stripe.prices.update(priceId, { active: false });
          } catch {
            // ignorar precios huérfanos
          }
        }
        const newPrice = await stripe.prices.create({
          product: productId,
          unit_amount: price,
          currency: currency.toLowerCase(),
          recurring: isOneTime ? undefined : { interval: interval as Stripe.Price.Recurring.Interval },
          metadata: { mode, planId },
        });
        priceId = newPrice.id;
        created = true;
      }
      await planRef.set({ [priceField]: priceId }, { merge: true });
      syncResults[mode] = { productId, priceId, created };
    }

    // 3. Upsert final del plan con field legacy para compatibilidad.
    const data: any = {
      id: planId,
      name,
      price,
      currency: currency.toLowerCase(),
      interval,
      features: Array.isArray(features) ? features : [],
      updatedAt: Date.now(),
    };
    if (syncResults.test) data.stripePriceIdTest = syncResults.test.priceId;
    if (syncResults.live) data.stripePriceIdLive = syncResults.live.priceId;
    data.stripePriceId =
      data.stripePriceIdTest || data.stripePriceIdLive || existing.stripePriceId || "";
    await planRef.set(data, { merge: true });

    return NextResponse.json({
      success: true,
      planId,
      modes: modes.length ? modes : undefined,
      syncResults,
      note: modes.length === 0 ? "No hay claves Stripe configuradas (test/live)." : undefined,
    });
  } catch (err: any) {
    console.error("[Stripe Sync] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}