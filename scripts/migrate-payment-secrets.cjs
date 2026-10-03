/**
 * Migracion de credenciales de pago: /site/config (PUBLICO) -> /paymentConfig (PRIVADO).
 *
 * Las claves estaban en un documento con "allow read: if true", asi que ya son
 * publicas y hay que rotarlas igualmente. Este script:
 *   1. copia las credenciales a /paymentConfig/default
 *   2. las elimina de /site/config
 *   3. borra /paymentConfig/default si no quedo ninguna
 *
 * Usa el Admin SDK, que ignora las reglas. No imprime ningun valor de clave.
 *
 * Ejecutar:  node scripts/migrate-payment-secrets.cjs
 */
process.env.FIREBASE_DATABASE_URL ||= "https://invify-online-default-rtdb.firebaseio.com";

const fs = require("node:fs");
const path = require("node:path");

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

const SECRET_FIELDS = [
  "stripeTestSecretKey",
  "stripeTestWebhookSecret",
  "stripeLiveSecretKey",
  "stripeLiveWebhookSecret",
  "paypalTestSecret",
  "paypalLiveSecret",
  "mercadopagoTestAccessToken",
  "mercadopagoTestWebhookSecret",
  "mercadopagoLiveAccessToken",
  "mercadopagoLiveWebhookSecret",
];

(async () => {
  const E = loadEnv();
  const projectId = E.FIREBASE_ADMIN_PROJECT_ID || E.FIREBASE_PROJECT_ID || E.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = E.FIREBASE_ADMIN_CLIENT_EMAIL || E.FIREBASE_CLIENT_EMAIL;
  const privateKey = (E.FIREBASE_ADMIN_PRIVATE_KEY || E.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Faltan FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY");
    process.exit(1);
  }

  const { cert, initializeApp } = require("firebase-admin/app");
  const { getFirestore, FieldValue } = require("firebase-admin/firestore");
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore(app);

  const siteRef = db.collection("site").doc("config");
  const payRef = db.collection("paymentConfig").doc("default");

  const siteSnap = await siteRef.get();
  if (!siteSnap.exists) {
    console.log("site/config no existe. Nada que migrar.");
    process.exit(0);
  }
  const site = siteSnap.data();

  const moving = {};
  for (const f of SECRET_FIELDS) {
    if (typeof site[f] === "string" && site[f].trim()) moving[f] = site[f];
  }
  const names = Object.keys(moving);
  if (names.length === 0) {
    console.log("site/config ya no tiene credenciales. Nada que migrar.");
    process.exit(0);
  }

  // 1. Copiar a la coleccion privada
  const paySnap = await payRef.get();
  const existing = paySnap.exists ? paySnap.data() : {};
  const merged = { ...existing };
  for (const f of names) merged[f] = moving[f];
  await payRef.set(merged, { merge: true });
  console.log(`1. Copiadas ${names.length} credenciales a /paymentConfig/default:`);
  for (const f of names) console.log(`     - ${f} (${String(moving[f]).length} ch)`);

  // 2. Borrarlas del documento publico
  const removal = Object.fromEntries(names.map((f) => [f, FieldValue.delete()]));
  await siteRef.set(removal, { merge: true });
  console.log(`2. Eliminadas ${names.length} credenciales de /site/config (publico).`);

  // 3. Limpieza
  const after = await payRef.get();
  const afterData = after.data() || {};
  const left = SECRET_FIELDS.filter((f) => typeof afterData[f] === "string" && afterData[f].trim());
  if (left.length === 0) {
    await payRef.delete();
    console.log("3. /paymentConfig/default vacio: eliminado.");
  } else {
    console.log(`3. /paymentConfig/default conserva ${left.length} credenciales.`);
  }

  console.log("\nIMPORTANTE: estas claves ya fueron publicadas. Rota las tres cuentas.");
  await app.delete();
  process.exit(0);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});