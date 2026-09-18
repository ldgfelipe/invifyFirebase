// ============================================================================
// API GET /api/site/settings - Expone configuración pública segura.
// Solo expone stripeTestMode (test/live) y datos de landing, nunca secretos.
// Usado por PricingFlow para decidir mode sin depender de localStorage.
// ============================================================================
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await adminDb.collection("site").doc("config").get();
    if (!snap.exists) {
      return NextResponse.json({ stripeTestMode: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const data = snap.data() as any;
    // stripeTestMode !== false => test (default true por seguridad)
    const stripeTestMode = data.stripeTestMode !== false;
    return NextResponse.json(
      { stripeTestMode, mode: stripeTestMode ? "test" : "live" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return NextResponse.json({ stripeTestMode: true, mode: "test", error: err.message }, { status: 500 });
  }
}
