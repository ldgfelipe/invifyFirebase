// ============================================================================
// API /api/invitations/create
// Crea una invitación consumiendo el cupo del plan de la cuenta (sin pago).
// Valida: sesión, plan con cupo disponible y acceso a la plantilla.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  getAccountUsage,
  entitlementAllowsTemplate,
} from "@/lib/entitlements";
import { cloneTemplateToInvitation } from "@/lib/firestore";
import { generateUniqueSlug } from "@/lib/slug";
import { LogHelper } from "@/lib/logging";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const idToken = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!idToken) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  let body: { templateId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const templateId = body.templateId;
  if (!templateId) {
    return NextResponse.json({ error: "templateId requerido" }, { status: 400 });
  }

  const usage = await getAccountUsage(uid);
  if (!usage.entitlements) {
    return NextResponse.json(
      { error: "No tienes un plan con invitaciones disponibles. Compra un plan para crear." },
      { status: 402 }
    );
  }
  if (!entitlementAllowsTemplate(usage.entitlements, templateId)) {
    return NextResponse.json(
      { error: "Tu plan no incluye esta plantilla. Mejora a Premium para todo el catálogo." },
      { status: 403 }
    );
  }
  if (!usage.canCreateMore) {
    return NextResponse.json(
      { error: "Alcanzaste el límite de invitaciones activas de tu plan." },
      { status: 409 }
    );
  }

  const tplSnap = await adminDb.collection("templates").doc(templateId).get();
  if (!tplSnap.exists || (tplSnap.data() as any).active === false) {
    return NextResponse.json({ error: "Plantilla no disponible" }, { status: 404 });
  }
  const tplName = (tplSnap.data() as any).name ?? "mi-invitacion";

  const slug = await generateUniqueSlug(tplName, async (candidate) => {
    const snap = await adminDb
      .collection("invitations")
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    return !snap.empty;
  });

  try {
    const invitationId = await cloneTemplateToInvitation({
      ownerUid: uid,
      templateId,
      slug,
      planId: usage.entitlements.planId,
      orderId: null,
      features: usage.entitlements.features,
    });
    await LogHelper.invitationCloned(invitationId, templateId, uid);
    return NextResponse.json({ invitationId, slug });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
