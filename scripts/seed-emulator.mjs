// ============================================================================
// Seed LOCAL - puebla Firestore EMULATOR con datos de prueba.
//
// Qué hace:
//   1. Crea planes con priceIds ficticios (no toca Stripe).
//   2. Crea la plantilla demo-boda.
//   3. Crea un usuario admin local (admin@invify.local / Admin123!).
//   4. Carga la config del sitio (hero/SEO).
//
// Requisitos:
//   - Firebase emulators corriendo: npm run emulators
//     (verifica que localhost:8081 responda antes de ejecutar)
//
// Ejecutar:
//   npm run seed:local
//
// IMPORTANTE: Este script solo toca el emulador local; el proyecto real en
// Firebase NO se ve afectado nunca.
// ============================================================================
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { PLANS, TEMPLATES, siteConfig } from "./seedData.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Force admin SDK to hit the local emulator.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8081";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";

// Load .env.local
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const env = { ...process.env, ...loadEnv(resolve(ROOT, ".env.local")) };
const PROJECT_ID = env.FIREBASE_ADMIN_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Init admin app — credentials are ignored by emulators.
function initAdmin() {
  if (getApps().length) return getApps()[0];
  const opts = { projectId: PROJECT_ID };
  // Even though the emulator ignores credentials, we keep compatibility
  // with the prod seed by passing them if present.
  if (env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) {
    opts.credential = cert({
      projectId: PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }
  return initializeApp(opts);
}

const adminApp = initAdmin();
const db = getFirestore(adminApp);
const auth = getAuth(adminApp);

// ---- Helpers ----------------------------------------------------------------

const adminEmail = "admin@invify.local";
const adminPass = "Admin123!";

async function seedPlans() {
  console.log("== Planes (mock) ==");
  for (const plan of PLANS) {
    const stripePriceId = `price_local_${plan.id}`;
    await db.collection("plans").doc(plan.id).set(
      { ...plan, stripePriceId, updatedAt: Date.now() },
      { merge: true }
    );
    console.log(`  ✓ /plans/${plan.id}  stripePriceId=${stripePriceId}`);
  }
}

async function seedTemplate() {
  console.log("== Plantillas (catálogo 30) ==");
  for (const tpl of TEMPLATES) {
    await db.collection("templates").doc(tpl.id).set(tpl, { merge: true });
    console.log(`  ✓ /templates/${tpl.id} (${tpl.category})`);
  }
}

async function seedSiteConfig() {
  console.log("== Config del sitio ==");
  await db.collection("site").doc("config").set(siteConfig(), { merge: true });
  console.log("  ✓ /site/config");
}

async function seedAdminUser() {
  console.log("== Usuario admin local ==");
  let uid;
  try {
    const user = await auth.createUser({ email: adminEmail, password: adminPass, displayName: "Admin Local" });
    uid = user.uid;
    console.log(`  ✓ Auth usuario creado: ${adminEmail}`);
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      const user = await auth.getUserByEmail(adminEmail);
      uid = user.uid;
      console.log(`  ℹ Auth usuario ya existe: ${adminEmail} (uid=${uid})`);
      await auth.updateUser(uid, { password: adminPass, displayName: "Admin Local" });
    } else {
      throw err;
    }
  }

  await db.collection("users").doc(uid).set(
    { uid, email: adminEmail, displayName: "Admin Local", role: "admin", createdAt: new Date().toISOString() },
    { merge: true }
  );
  console.log(`  ✓ /users/${uid}  role=admin`);
  console.log(`\n  Credenciales de login local:`);
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPass}`);
}

// ---- Main -------------------------------------------------------------------

async function main() {
  if (!PROJECT_ID) throw new Error("Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID en .env.local");

  console.log(`Proyecto Firestore (emulador local): ${PROJECT_ID}`);
  console.log(`  Emulador: localhost:8081\n`);

  await seedPlans();
  await seedTemplate();
  await seedSiteConfig();
  await seedAdminUser();

  console.log("\n✅ Seed del emulador completado.");
  console.log("\nSiguiente paso: npm run dev  (o npm run dev:local)");
}

main().catch((err) => {
  console.error("\n[X] Error en seed local:", err.message ?? err);
  const hint = !process.env.FIRESTORE_EMULATOR_HOST
    ? "\nAsegúrate de que los emuladores estén corriendo: npm run emulators"
    : "";
  console.error(hint);
  process.exit(1);
});