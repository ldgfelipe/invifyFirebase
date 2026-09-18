// ============================================================================
// Seed de Invify - puebla Firestore con datos de ejemplo + planes de Stripe (TEST).
//
// Qué hace:
//   1. Crea (o reutiliza) 3 productos + precios de STRIPE en modo TEST.
//   2. Escribe los planes en Firestore /plans/{plan_basic|plan_pro|plan_premium}.
//   3. Escribe una plantilla demo de boda en /templates/demo-boda.
//   4. Puebla /site/config (hero + SEO de la landing).
//
// Cómo ejecutarlo (desde la raíz del proyecto):
//   npm run seed
//
// Credenciales de Firestore (usa la primera que exista):
//   a) .env.local  ->  FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY
//   b) GOOGLE_APPLICATION_CREDENTIALS=<ruta al json de service account>
//   c) ADC:  gcloud auth application-default login   (cuenta con acceso al proyecto)
//
// Stripe usa STRIPE_SECRET_KEY de .env.local (modo TEST, no cobra).
// ============================================================================
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import { PLANS, TEMPLATES, siteConfig } from "./seedData.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ----------------------------- Env loader --------------------------------
function loadEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = { ...process.env, ...loadEnv(resolve(ROOT, ".env.local")) };
const PROJECT_ID = env.FIREBASE_ADMIN_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// ----------------------------- Firebase -----------------------------------
function initAdmin() {
  if (getApps().length) return getApps()[0];
  const options = { projectId: PROJECT_ID };
  if (env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) {
    options.credential = cert({
      projectId: PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }
  // Sin credencial explícita => Application Default Credentials (caso b/c).
  return initializeApp(options);
}

const db = getFirestore(initAdmin());

// ----------------------------- Stripe ------------------------------------
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const USD = "usd";

async function ensureStripePrice(plan) {
  const planDoc = await db.collection("plans").doc(plan.id).get();
  if (planDoc.exists && planDoc.data().stripePriceId) {
    console.log(`  [Stripe] ${plan.name}: reutilizando price ${planDoc.data().stripePriceId}`);
    return planDoc.data().stripePriceId;
  }
  const product = await stripe.products.create({ name: `Invify - ${plan.name}` });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.price,
    currency: USD,
  });
  console.log(`  [Stripe] ${plan.name}: creado price ${price.id}`);
  return price.id;
}

// ----------------------------- Main ---------------------------------------
async function main() {
  if (!PROJECT_ID) throw new Error("Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID / FIREBASE_ADMIN_PROJECT_ID en .env.local");
  if (!env.STRIPE_SECRET_KEY) throw new Error("Falta STRIPE_SECRET_KEY en .env.local (clave TEST)");

  console.log(`Proyecto: ${PROJECT_ID}`);
  console.log("== Planes (Stripe TEST) ==");
  const pricing = [];
  for (const plan of PLANS) {
    const stripePriceId = await ensureStripePrice(plan);
    pricing.push(stripePriceId);
    await db.collection("plans").doc(plan.id).set(
      { ...plan, currency: USD, stripePriceId, updatedAt: Date.now() },
      { merge: true }
    );
    console.log(`  [Firestore] /plans/${plan.id}`);
  }

  console.log("== Plantillas (catálogo 30) ==");
  for (const tpl of TEMPLATES) {
    await db.collection("templates").doc(tpl.id).set(tpl, { merge: true });
    console.log(`  [Firestore] /templates/${tpl.id} (${tpl.category})`);
  }

  console.log("== Config del sitio ==");
  await db.collection("site").doc("config").set(siteConfig(), { merge: true });
  console.log("  [Firestore] /site/config");

  console.log("\nSeed completado.");
  console.log("\nSiguientes pasos:");
  console.log("  1) Dale rol admin a tu usuario: Firestore > users/{tu-uid} > role='admin'");
  console.log("  2) Despliega (ver README o comandos de gcloud/firebase).");
}

main().catch((err) => {
  console.error("\n[X] Error en el seed:");
  console.error(err.message ?? err);
  const hint =
    err.code === "PERMISSION_DENIED"
      ? "\nPERMISSION_DENIED: revisa que el usuario/quien ejecuta tenga acceso al proyecto,\no que creaste la base de datos en Firebase Console (Firestore > Create database)."
      : "";
  console.error(hint || "\nConsejo: si no tienes credenciales de admin, corre:\n  gcloud auth application-default login\ny vuelve a ejecutar  npm run seed");
  process.exit(1);
});