// ============================================================================
// API /api/invitations/[id]  (PATCH)
// Actualiza estado de publicación y/o conservación de una invitación.
// Valida propiedad y, al publicar, respeta el cupo del plan.
//   body: { status?: "published" | "draft"; retain?: boolean;
//           saveContent?: { builderConfig: BuilderConfig; title?: string; slug?: string } }
// saveContent guarda contenido con cupo: en borrador es libre; publicada
// consume 1 de los 2 cambios (403 + exhausted:true si están agotados).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  getUserEntitlements,
  countActiveInvitationsExcluding,
} from "@/lib/entitlements";
import { retainInvitation } from "@/lib/firestore";
import { LogHelper } from "@/lib/logging";
import { RETENTION_GRACE_MS, filterBuilderConfig, getInvitationFeatures } from "@/lib/plans";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";
import type { BuilderConfig, Invitation } from "@/lib/types";
import { FREE_CHANGES_AFTER_PUBLISH } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  let body: {
    status?: "published" | "draft";
    retain?: boolean;
    saveContent?: { builderConfig: BuilderConfig; title?: string; slug?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const invRef = adminDb.collection("invitations").doc(params.id);
  const snap = await invRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }
  const inv = snap.data() as Invitation;

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const isAdmin = (userSnap.data() as any)?.role === "admin";
  if (inv.ownerUid !== uid && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Conservar / dejar de conservar.
  if (typeof body.retain === "boolean") {
    if (body.retain) {
      await retainInvitation(params.id, uid);
    } else {
      const patch: Record<string, unknown> = { retain: false };
      if (inv.status !== "published" && inv.unpublishedReason === "event_expired") {
        patch.deleteAfter = (inv.unpublishedAt ?? Date.now()) + RETENTION_GRACE_MS;
      }
      await invRef.update(patch);
    }
  }

  // Guardar contenido (editor visual + ajustes) con cupo post-publicación.
  if (body.saveContent) {
    const sc = body.saveContent;
    if (!sc.builderConfig || !Array.isArray(sc.builderConfig.modules)) {
      return NextResponse.json({ error: "builderConfig inválido" }, { status: 400 });
    }
    // Sanitiza según el plan (quita RSVP/Quiz/Audio si no están incluidos).
    const features = getInvitationFeatures(inv);
    const sanitized = filterBuilderConfig(sc.builderConfig, features);
    const patch: Record<string, unknown> = {
      builderConfig: sanitized,
      themeColor: sanitized.theme.primaryColor,
    };
    if (typeof sc.title === "string" && sc.title.trim()) {
      patch.title = sc.title.trim().slice(0, 120);
    }
    if (typeof sc.slug === "string" && sc.slug.trim()) {
      const wanted = slugify(sc.slug);
      if (!wanted) {
        return NextResponse.json({ error: "Slug no válido. Usa letras, números y guiones." }, { status: 400 });
      }
      if (RESERVED_SLUGS.has(wanted)) {
        return NextResponse.json({ error: "Palabra reservada" }, { status: 409 });
      }
      if (wanted !== inv.slug) {
        const dup = await adminDb.collection("invitations").where("slug", "==", wanted).limit(1).get();
        if (!dup.empty && dup.docs[0].id !== params.id) {
          return NextResponse.json({ error: "Ese enlace ya está en uso. Prueba otro." }, { status: 409 });
        }
        patch.slug = wanted;
      }
    }

    let used = inv.changesAfterPublish ?? 0;
    const published = inv.status === "published";
    if (published) {
      if (used >= FREE_CHANGES_AFTER_PUBLISH) {
        return NextResponse.json(
          { error: "Agotaste los 2 cambios gratuitos de esta publicación.", exhausted: true, used },
          { status: 403 }
        );
      }
      used += 1;
      patch.changesAfterPublish = used;
    }
    await invRef.update(patch);
    return NextResponse.json({
      ok: true,
      published,
      used,
      remaining: published ? Math.max(0, FREE_CHANGES_AFTER_PUBLISH - used) : FREE_CHANGES_AFTER_PUBLISH,
    });
  }

  // Cambiar estado de publicación.
  if (body.status === "published") {
    const entitlements = await getUserEntitlements(uid);
    if (entitlements && entitlements.quota !== "unlimited") {
      const activeOthers = await countActiveInvitationsExcluding(uid, params.id);
      if (activeOthers >= entitlements.quota) {
        return NextResponse.json(
          { error: "Alcanzaste el límite de invitaciones activas de tu plan." },
          { status: 409 }
        );
      }
    }
    // Sanitiza builderConfig: quita RSVP/Quiz/Audio si el plan no lo incluye (Básico)
    const features = getInvitationFeatures(inv);
    const sanitized = filterBuilderConfig(inv.builderConfig, features);
    const patch: Record<string, unknown> = {
      status: "published",
      publishedAt: Date.now(),
      changesAfterPublish: 0,
    };
    if (sanitized.modules.length !== inv.builderConfig.modules.length) {
      patch.builderConfig = sanitized;
      patch.themeColor = sanitized.theme.primaryColor;
    }
    await invRef.update(patch);
    await LogHelper.invitationPublished(params.id, uid);
  } else if (body.status === "draft") {
    // Despublicación manual: no programa borrado (solo la vigencia lo hace).
    await invRef.update({
      status: "draft",
      unpublishedAt: Date.now(),
      unpublishedReason: "manual",
    });
    await LogHelper.invitationUnpublished(params.id, "manual", uid);
  }

  return NextResponse.json({ ok: true });
}
