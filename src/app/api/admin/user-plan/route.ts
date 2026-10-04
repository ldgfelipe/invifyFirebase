// ============================================================================
// API /api/admin/user-plan  (POST)
//
// Cambia el plan de una cuenta desde admin. Sirve para dos cosas:
//   - corregir una compra que se cobró mal o que no se registró;
//   - dar Pro o Premium a un cliente o a un probador para que vea lo que incluye
//     el plan, sin tener que pasar por el checkout.
//
// POR QUE NO BASTA CAMBIAR LOS ENTITLEMENTS DE LA CUENTA
// Cada invitación guarda una COPIA de las features del plan en el momento de
// comprarlo (inv.features) y getInvitationFeatures la prefiere sobre el planId.
// Es a proposito: si el cliente compra Pro y luego se le caduca, la invitación
// conserva lo que pago. Pero significa que subir el plan de la cuenta no
// desbloquea las invitaciones ya creadas, y sin esto el selector de plan no
// serviria para probar nada.
//
// ASI QUE ESTA RUTA TAMBIEN REESCRIBE ESAS COPIAS, con dos salvedades:
//   - por omision solo en invitaciones de la cuenta (ownerUid), nunca en las de
//     demo del catalogo;
//   - los datos ya recogidos NO se tocan. Bajar a Basico esconde el formulario y
//     el quiz, pero las confirmaciones y respuestas que ya llegaron siguen
//     guardadas: si se borraran, el cliente perderia los datos de sus invitados
//     por un cambio de plan.
//
// body: {
//   uid: string;
//   planId: string | null;      // null = quitar el plan (cuenta gratuita)
//   applyToInvitations: boolean; // reescribir features de las invitaciones
//   charge: boolean;            // registrar el pedido como pagado
//   reason: string;             // obligatorio: queda en el log
// }
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { resolvePlanEntitlements, replaceEntitlements, FREE_FEATURES } from "@/lib/plans";
import { log } from "@/lib/logging";
import type { UserEntitlements, PlanFeatures } from "@/lib/types";

export const runtime = "nodejs";

/** Máximo de invitaciones que se reescriben en una sola llamada. */
const MAX_INVITACIONES = 200;

async function requireAdmin(req: NextRequest) {
  const raw = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!raw) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(raw);
    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!snap.exists || snap.data()?.role !== "admin") return null;
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: {
    uid?: string;
    planId?: string | null;
    applyToInvitations?: boolean;
    charge?: boolean;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { uid, applyToInvitations = true, charge = false } = body;
  const planId = body.planId ?? null;
  const reason = (body.reason ?? "").trim();

  if (!uid) return NextResponse.json({ error: "Falta uid" }, { status: 400 });
  if (!reason) {
    return NextResponse.json(
      { error: "Es obligatorio indicar el motivo: queda registrado en el log de auditoría." },
      { status: 400 }
    );
  }
  // Se valida ANTES de escribir nada: si se hiciera despues, un cobro sin plan
  // devolveria 400 dejando la cuenta ya sin entitlements.
  if (charge && !planId) {
    return NextResponse.json(
      { error: "No se puede registrar un cobro al quitar el plan." },
      { status: 400 }
    );
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const user = userSnap.data() as any;
  const current = (user.entitlements ?? null) as UserEntitlements | null;

  // ---- 1) Resolver los entitlements del plan destino ------------------------
  let entitlements: UserEntitlements | null = null;
  let features: PlanFeatures = { ...FREE_FEATURES };

  if (planId) {
    const planSnap = await adminDb.collection("plans").doc(planId).get();
    if (!planSnap.exists) {
      return NextResponse.json({ error: `El plan "${planId}" no existe` }, { status: 404 });
    }
    const planData = planSnap.data() as any;
    const resolved = resolvePlanEntitlements(planId, planData);
    if (!resolved) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }
    // replaceEntitlements y no mergeEntitlements: el merge solo une capacidades
    // y nunca quita, así que bajar de Pro a Básico no ocultaría nada.
    entitlements = replaceEntitlements({ current, plan: resolved });
    features = resolved.features;
  }

  const planNombre = entitlements?.planName ?? "Gratuito";
  const antes = current?.planName ?? "Gratuito";

  // ---- 2) Cuenta ------------------------------------------------------------
  await userRef.set(
    planId ? { entitlements } : { entitlements: null },
    { merge: true }
  );

  // ---- 3) Invitaciones existentes -------------------------------------------
  // Solo las de la cuenta y solo el snapshot de features. No se toca el builderConfig:
  // los módulos siguen en el documento y vuelven a aparecer si el plan sube otra vez.
  let invitacionesActualizadas = 0;
  let invitacionesOmitidas = 0;
  const snapshot = await adminDb
    .collection("invitations")
    .where("ownerUid", "==", uid)
    .limit(MAX_INVITACIONES)
    .get();

  if (applyToInvitations) {
    const batch = adminDb.batch();
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        features,
        planId: planId ?? "",
        ...(planId ? { tier: "premium", tierUpdatedAt: Date.now() } : {}),
      });
      invitacionesActualizadas++;
    }
    if (invitacionesActualizadas) await batch.commit();
  } else {
    invitacionesOmitidas = snapshot.size;
  }

  // ---- 4) Pedido (opcional) -------------------------------------------------
  // Con "cobrar" se crea un order pagado para que la venta aparezca en el panel de
  // ventas y en el total gastado del usuario. Sin él, el cambio queda como una
  // corrección interna sin reflejo en la facturación.
  let orderId: string | null = null;
  if (charge) {
    const planData = (await adminDb.collection("plans").doc(planId!).get()).data() as any;
    const orderRef = adminDb.collection("orders").doc();
    orderId = orderRef.id;
    await orderRef.set({
      id: orderRef.id,
      uid,
      planId,
      invitationId: null,
      status: "paid",
      provider: "manual",
      stripeSessionId: `admin_${orderRef.id}`,
      amount: planData?.price ?? 0,
      currency: planData?.currency ?? "mxn",
      createdAt: Date.now(),
      paidAt: Date.now(),
      appliedBy: admin.email ?? admin.uid,
      note: reason,
    });
  }

  await log({
    action: "admin.plan_changed",
    userId: admin.uid,
    // Un cambio de plan sin actor registrado no sirve para auditar nada, asi que
    // se cae al uid cuando el token no trae email.
    userEmail: admin.email ?? admin.uid,
    targetId: uid,
    targetType: "user",
    severity: planId ? "info" : "warning",
    description: `Plan de ${user.email}: ${antes} → ${planNombre}`,
    metadata: {
      from: current?.planId ?? null,
      to: planId,
      applyToInvitations,
      invitacionesActualizadas,
      orderId,
      charged: charge,
      reason,
      // El motivo puede contener datos del cliente: el log lo guarda tal cual,
      // asi que conviene que sea corto.
      por: admin.email ?? admin.uid,
    },
  });

  return NextResponse.json({
    ok: true,
    planId,
    planName: planNombre,
    invitacionesActualizadas,
    invitacionesOmitidas,
    orderId,
  });
}