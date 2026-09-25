// Lee la config del asistente guardada en Firestore para diagnosticar.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";

// Carga .env.local y .env a mano (el proyecto no usa dotenv en scripts).
for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (/^["'].*["']$/.test(v)) v = v.slice(1, -1);
    process.env[m[1]] ??= v.replace(/\\n/g, "\n");
  }
}

const { FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_PROJECT_ID } =
  process.env;

if (!FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY) {
  console.log("Faltan FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  projectId: FIREBASE_ADMIN_PROJECT_ID,
});

const snap = await getFirestore().collection("aiConfig").doc("global").get();
if (!snap.exists) {
  console.log("No hay documento aiConfig/global");
  process.exit(0);
}
const d = snap.data();
console.log("provider      :", d.provider);
console.log("baseUrl       :", d.baseUrl);
console.log("model         :", d.model);
console.log("enabled       :", d.enabled);
console.log("apiKey        :", d.apiKey ? `${String(d.apiKey).slice(0, 7)}… (${String(d.apiKey).length} chars)` : "(vacía)");
console.log("lastTest      :", d.lastTest ? JSON.stringify(d.lastTest) : "(sin test)");
console.log("updatedAt     :", d.updatedAt ? new Date(d.updatedAt).toISOString() : "(nunca)");
