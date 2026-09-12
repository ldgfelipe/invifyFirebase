// ============================================================================
// API /api/logs - Endpoint para recibir logs del cliente
// Guarda entradas de auditoría en Firestore via Admin SDK
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validación básica
    if (!body.action || !body.description) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const entry = {
      id: crypto.randomUUID(),
      action: body.action,
      timestamp: body.timestamp ?? Date.now(),
      userId: body.userId,
      userEmail: body.userEmail,
      userRole: body.userRole,
      targetId: body.targetId,
      targetType: body.targetType,
      metadata: body.metadata,
      severity: body.severity ?? "info",
      description: body.description,
      ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
      userAgent: req.headers.get("user-agent"),
    };

    await adminDb.collection("logs").doc(entry.id).set(entry);

    return NextResponse.json({ success: true, id: entry.id });
  } catch (err: any) {
    console.error("[API Logs] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET para admin: lista logs con filtros
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const action = searchParams.get("action");
    const severity = searchParams.get("severity");
    const userId = searchParams.get("userId");
    const targetType = searchParams.get("targetType");
    const from = searchParams.get("from"); // timestamp
    const to = searchParams.get("to"); // timestamp

    let query: any = adminDb.collection("logs").orderBy("timestamp", "desc");

    if (action) query = query.where("action", "==", action);
    if (severity) query = query.where("severity", "==", severity);
    if (userId) query = query.where("userId", "==", userId);
    if (targetType) query = query.where("targetType", "==", targetType);
    if (from) query = query.where("timestamp", ">=", parseInt(from));
    if (to) query = query.where("timestamp", "<=", parseInt(to));

    const snap = await query.limit(limit).offset(offset).get();
    const logs = snap.docs.map((d: any) => d.data());

    return NextResponse.json({ logs, count: logs.length });
  } catch (err: any) {
    console.error("[API Logs GET] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}