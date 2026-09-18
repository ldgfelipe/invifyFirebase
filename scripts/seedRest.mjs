// ============================================================================
// seedRest.mjs - Seed de Invify vía Firestore REST API usando el access token
// de la sesión de `firebase login` (scope cloud-platform). No requiere cuenta
// de servicio. El token se pasa por variable de entorno (NO se guarda en disco).
//
//   $env:INVIFY_FB_TOKEN = "<access_token>"
//   node scripts/seedRest.mjs              # (idempotente)
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { PLANS, TEMPLATES, siteConfig, toFirestoreValue, toDocPath, PROYECTO_KEY } from "./seedData.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(...files) {
  const out = {};
  for (const f of files) {
    const p = resolve(__dirname, "..", f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    }
  }
  return out;
}

const env = { ...loadEnv(".env.local", ".env"), ...process.env };
const PROJECT_ID = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || env.FIREBASE_ADMIN_PROJECT_ID || PROYECTO_KEY;
const TOKEN = env.INVIFY_FB_TOKEN || env.FIREBASE_TOKEN;
const STRIPE_KEY = env.STRIPE_SECRET_KEY;
const ADMIN_UID = env.INVIFY_ADMIN_UID;

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function docName(path) {
  return `projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

async function api(path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

async function docGet(path) {
  try {
    return await api(path, null);
  } catch (e) {
    if (/404/.test(String(e.message))) return null;
    throw e;
  }
}

async function commitBatched(batch, label) {
  for (let i = 0; i < batch.length; i += 500) {
    await api(":commit", { writes: batch.slice(i, i + 500) });
  }
  console.log(`  [REST] ${label} (${batch.length} doc(s))`);
}

function upsert(path, data) {
  return { update: { name: docName(path), fields: toFirestoreValue(data).mapValue.fields } };
}

async function ensureStripePrice(plan) {
  const doc = await docGet(`plans/${plan.id}`);
  if (doc?.fields?.stripePriceId?.stringValue) {
    console.log(`  [Stripe] ${plan.name}: reutilizando price ${doc.fields.stripePriceId.stringValue}`);
    return doc.fields.stripePriceId.stringValue;
  }
  if (!STRIPE_KEY) throw new Error("Falta STRIPE_SECRET_KEY en .env.local");
  const stripe = new Stripe(STRIPE_KEY);
  const product = await stripe.products.create({ name: `Invify - ${plan.name}` });
  const price = await stripe.prices.create({ product: product.id, unit_amount: plan.price, currency: "usd" });
  console.log(`  [Stripe] ${plan.name}: creado price ${price.id}`);
  return price.id;
}

async function main() {
  if (!TOKEN) throw new Error("Falta token: $env:INVIFY_FB_TOKEN");
  console.log(`Proyecto: ${PROJECT_ID}`);

  console.log("== Planes (Stripe TEST) ==");
  const batchPlans = [];
  for (const plan of PLANS) {
    const stripePriceId = await ensureStripePrice(plan);
    batchPlans.push(upsert(`plans/${plan.id}`, { ...plan, currency: "usd", stripePriceId, updatedAt: Date.now() }));
  }
  await commitBatched(batchPlans, "planes");

  console.log("== Plantillas (catálogo 30) ==");
  await commitBatched(TEMPLATES.map((t) => upsert(`templates/${t.id}`, t)), "plantillas 30");

  console.log("== Config del sitio ==");
  await commitBatched([upsert("site/config", siteConfig())], "site config");

  console.log("== Usuario admin ==");
  if (ADMIN_UID) {
    await commitBatched(
      [
        upsert(`users/${ADMIN_UID}`, {
          uid: ADMIN_UID,
          email: env.INVIFY_ADMIN_EMAIL || "",        
          displayName: env.INVIFY_ADMIN_NAME || "Admin",
          role: "admin",
          createdAt: Date.now(),
        }),
      ],
      `usuario admin ${ADMIN_UID}`
    );
  } else {
    console.log("  (INVIFY_ADMIN_UID no definido - lo saltamos)");
  }

  console.log("\nSeed REST completado.");
}

main().catch((err) => {
  console.error("\n[X] Error en seedRest:");
  console.error(err.message ?? err);
  process.exit(1);
});