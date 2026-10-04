/**
 * Define el campo `entitlement` de los documentos de /plans.
 *
 * POR QUE
 * Los ids de /plans los genera Stripe (p8SWcbaEcxNcRradKb3a, 7ULT3nr...), asi que
 * ninguno coincide con las claves de PLAN_CATALOG (plan_basic, plan_pro,
 * plan_premium). Antes de este script, resolvePlanEntitlements caia al fallback
 * permisivo: CUPO ILIMITADO y TODAS las features. Como ademas ningun documento
 * traia `entitlement`, el resultado era que un cliente que habia pagado "Basico"
 * ($15 000) recibia lo mismo que Premium: ilimitadas, RSVP, quiz, musica y todo
 * el catalogo. Como las features de las invitaciones se copian del plan al
 * comprar, tampoco se podian "probar los alcances" de cada plan: todos eran
 * iguales.
 *
 * QUE HACE
 * Clasifica cada plan por su NOMBRE (los ids no sirven) y le escribe el bloque
 * `entitlement` que le corresponde segun el catalogo de scripts/seedData.mjs.
 * Un plan cuyo nombre no reconoce NO se toca: se reporta para que lo revises a
 * mano, porque adivinar un plan es justo el bug que hay que evitar.
 *
 * Idempotente: no sobrescribe un `entitlement` que ya exista sin --force.
 *
 * USO
 *   node scripts/fix-plan-entitlements.cjs           # dry-run
 *   node scripts/fix-plan-entitlements.cjs --apply
 *   node scripts/fix-plan-entitlements.cjs --apply --force
 */
process.env.FIREBASE_DATABASE_URL ||= "https://invify-online-default-rtdb.firebaseio.com";

const fs = require("node:fs");
const path = require("node:path");

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

function loadEnv() {
  const out = {};
  for (const f of [".env.local", ".env"]) {
    const p = path.join(__dirname, "..", f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

/** "Basico " -> "basico"; quita acentos, espacios y signos. */
function normalizar(nombre) {
  return String(nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Bloques de entitlement. Deben coincidir con PLAN_CATALOG en src/lib/plans.ts
 * y con PLANS en scripts/seedData.mjs.
 */
const ENTITLEMENTS = {
  basico: {
    quota: 1,
    features: {
      rsvp: false,
      quiz: false,
      audio: false,
      stats: false,
      allTemplates: false,
      prioritySupport: false,
    },
  },
  pro: {
    quota: 5,
    features: {
      rsvp: true,
      quiz: true,
      audio: true,
      stats: true,
      allTemplates: false,
      prioritySupport: false,
    },
  },
  premium: {
    quota: "unlimited",
    features: {
      rsvp: true,
      quiz: true,
      audio: true,
      stats: true,
      allTemplates: true,
      prioritySupport: true,
    },
  },
};

/** Clasifica por nombre. `premium` se comprueba antes que `pro` porque lo contiene. */
function clasificar(nombre) {
  const n = normalizar(nombre);
  if (!n) return null;
  if (n.includes("premium")) return "premium";
  if (n.includes("basico") || n.includes("basic") || n.includes("esencial")) return "basico";
  if (n.includes("pro")) return "pro";
  return null;
}

(async () => {
  const E = loadEnv();
  const projectId =
    E.FIREBASE_ADMIN_PROJECT_ID || E.FIREBASE_PROJECT_ID || E.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = E.FIREBASE_ADMIN_CLIENT_EMAIL || E.FIREBASE_CLIENT_EMAIL;
  const privateKey = (E.FIREBASE_ADMIN_PRIVATE_KEY || E.FIREBASE_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Faltan FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY");
    process.exit(1);
  }

  const { cert, initializeApp } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore(app);

  console.log(`Proyecto: ${projectId}`);
  console.log(`Modo:     ${APPLY ? "APPLY" : "DRY-RUN (no escribe nada)"}${FORCE ? " + --force" : ""}\n`);

  const snap = await db.collection("plans").get();
  if (snap.empty) {
    console.log("No hay planes en /plans.");
    await app.delete();
    return;
  }

  const cambios = [];
  const sinClasificar = [];
  const yaDefinidos = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const etiqueta = String(data.name ?? "").trim() || doc.id;

    if (data.entitlement && !FORCE) {
      yaDefinidos.push({ id: doc.id, nombre: etiqueta });
      continue;
    }

    const clave = clasificar(data.name);
    if (!clave) {
      sinClasificar.push({ id: doc.id, nombre: etiqueta });
      continue;
    }
    cambios.push({
      ref: doc.ref,
      id: doc.id,
      nombre: etiqueta,
      clave,
      entitlement: ENTITLEMENTS[clave],
      antes: data.entitlement ?? null,
    });
  }

  console.log(`Planes en /plans: ${snap.size}\n`);
  for (const c of cambios) {
    console.log(`  ${c.nombre}  (${c.id})`);
    console.log(`     -> ${c.clave}: cupo ${c.entitlement.quota}`);
    console.log(
      `        ${Object.entries(c.entitlement.features)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ") || "sin capacidades extra"}`
    );
  }
  if (yaDefinidos.length) {
    console.log(`\n  ya tienen entitlement (se omiten): ${yaDefinidos.length}`);
    for (const y of yaDefinidos) console.log(`     ${y.nombre} (${y.id})`);
  }
  if (sinClasificar.length) {
    console.log(`\n  NO reconocidos por nombre, NO se tocan (revisar a mano): ${sinClasificar.length}`);
    for (const s of sinClasificar) console.log(`     ${s.nombre} (${s.id})`);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN: no se escribio nada.");
    console.log("Aplica con:  node scripts/fix-plan-entitlements.cjs --apply");
    await app.delete();
    return;
  }

  if (!cambios.length) {
    console.log("\nNada que escribir.");
    await app.delete();
    return;
  }

  const batch = db.batch();
  for (const c of cambios) {
    batch.set(c.ref, { entitlement: c.entitlement }, { merge: true });
  }
  await batch.commit();
  console.log(`\nEscritos ${cambios.length} planes.`);
  console.log(
    "OJO: las invitaciones ya compradas guardan una COPIA de las features. Para que el\n" +
      "cambio se vea en ellas usa Admin > Usuarios > Plan > aplicar a invitaciones."
  );
  await app.delete();
})().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});