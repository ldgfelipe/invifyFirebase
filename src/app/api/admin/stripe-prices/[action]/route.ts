// ============================================================================
// API /api/admin/stripe-prices/[action] - Actualiza o elimina Price/Product en Stripe
// Solo admin. action = "update" | "delete"
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
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

export async function POST(req: NextRequest, { params }: { params: { action: string } }) {
  const uid = await verifyAdmin(req);
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const action = params.action;
  if (action !== "update" && action !== "delete") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { priceId, productId, planName, amount, currency, interval, mode } = body;
    
    if (!mode || !["test", "live"].includes(mode)) {
      return NextResponse.json({ error: "Modo inválido (test|live)" }, { status: 400 });
    }

    const isTest = mode === "test";
    const stripe = await getStripe(isTest ? "test" : "live");

    if (action === "update") {
      if (!priceId) {
        return NextResponse.json({ error: "priceId requerido para actualizar" }, { status: 400 });
      }

      const updateData: any = {};
      if (planName) updateData.metadata = { name: planName };
      if (amount) updateData.unit_amount = amount;
      
      // Nota: Stripe no permite cambiar amount/currency/interval de un price existente
      // Solo se pueden actualizar metadata, nickname, etc.
      // Para cambiar amount/currency, hay que crear un nuevo price y archivar el anterior
      
      const updatedPrice = await stripe.prices.update(priceId, {
        metadata: { name: planName ?? "", mode: isTest ? "test" : "live" },
      });

      return NextResponse.json({ 
        success: true, 
        price: updatedPrice,
        note: "Solo se actualizó metadata. Para cambiar monto/moneda/intervalo, crea un nuevo price y archiva este."
      });
    }

    if (action === "delete") {
      if (!priceId) {
        return NextResponse.json({ error: "priceId requerido para eliminar" }, { status: 400 });
      }

      // 1. Archivar el price (no se puede eliminar, solo archivar)
      await stripe.prices.update(priceId, { active: false });

      // 2. Opcional: eliminar product si no tiene otros prices activos
      if (productId) {
        const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });
        if (prices.data.length === 0) {
          await stripe.products.del(productId);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: "Price archivado. Producto eliminado si no tenía otros prices activos."
      });
    }

    return NextResponse.json({ error: "Acción no implementada" }, { status: 400 });
  } catch (err: any) {
    console.error("[Stripe Price Admin] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}