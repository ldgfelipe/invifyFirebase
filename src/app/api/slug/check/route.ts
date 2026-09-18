// ============================================================================
// API GET /api/slug/check?slug=xxx&excludeId=invId
// Valida unicidad global de slug (case-insensitive, slugify) usando Admin SDK.
// Si existe, sugiere alternativa con sufijo numérico.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { slugify, RESERVED_SLUGS, generateUniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slug") ?? "";
  const excludeId = req.nextUrl.searchParams.get("excludeId") ?? "";

  const wanted = slugify(raw);

  if (!wanted) {
    return NextResponse.json({ valid: false, available: false, error: "Slug vacío", suggested: null });
  }

  if (RESERVED_SLUGS.has(wanted)) {
    // Sugiere con sufijo
    const suggested = await generateUniqueSlug(wanted, async (candidate) => {
      if (RESERVED_SLUGS.has(candidate)) return true;
      const snap = await adminDb.collection("invitations").where("slug", "==", candidate).limit(1).get();
      if (snap.empty) return false;
      // Si solo existe el propio doc excluido, considerar disponible
      if (excludeId && snap.docs[0].id === excludeId) return false;
      return true;
    });
    return NextResponse.json({ valid: false, available: false, error: "Palabra reservada", suggested, wanted });
  }

  const exists = await (async () => {
    const snap = await adminDb.collection("invitations").where("slug", "==", wanted).limit(1).get();
    if (snap.empty) return false;
    if (excludeId && snap.docs[0].id === excludeId) return false;
    return true;
  })();

  if (!exists) {
    return NextResponse.json({ valid: true, available: true, wanted, suggested: null });
  }

  // Existe -> sugerir alternativa
  const suggested = await generateUniqueSlug(wanted, async (candidate) => {
    if (RESERVED_SLUGS.has(candidate)) return true;
    const snap = await adminDb.collection("invitations").where("slug", "==", candidate).limit(1).get();
    if (snap.empty) return false;
    if (excludeId && snap.docs[0].id === excludeId) return false;
    return true;
  });

  return NextResponse.json({ valid: true, available: false, wanted, suggested });
}
