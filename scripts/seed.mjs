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

const PLANS = [
  { id: "plan_basic", name: "Básico", price: 900, features: ["1 invitación activa", "URL /i/slug propia", "Soporte de 1 tema"] },
  { id: "plan_pro", name: "Pro", price: 1900, features: ["5 invitaciones activas", "RSVP + Quiz + Música", "Estadísticas de vistas"] },
  { id: "plan_premium", name: "Premium", price: 2900, features: ["Invitaciones ilimitadas", "Todo el catálogo de temas", "Soporte prioritario"] },
];

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

// ----------------------------- Plantilla demo ----------------------------
function demoTemplate() {
  return {
    id: "demo-boda",
    name: "Boda Elegance",
    category: "boda",
    thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    active: true,
    createdAt: Date.now(),
    builderConfig: {
      theme: { primaryColor: "#C9A227", background: "#FFFBF2", fontFamily: "serif" },
      modules: [
        { id: "pre", type: "preloader", visible: true, text: "Ana & Luis", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80" },
        {
          id: "hdr", type: "header", visible: true,
          title: "Nos casamos",
          names: "Ana Peña & Luis Torres",
          date: "2026-11-14T16:00:00",
          subtitle: "Con amor, te invitamos a celebrar con nosotros",
          imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80",
        },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-11-14T16:00:00", label: "Falta para la boda" },
        { id: "au", type: "audio", visible: false, src: "" },
        {
          id: "ca", type: "carousel", visible: true,
          images: [
            { url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", caption: "Propuesta" },
            { url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80", caption: "Nuestra historia" },
            { url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80", caption: "El gran día" },
          ],
        },
        { id: "lc", type: "location", visible: true, venue: "Hacienda Los Olivos", address: "Km 12 Via Chía, Colombia", lat: 4.85595, lng: -74.06095, mapUrl: "" },
        { id: "dc", type: "dresscode", visible: true, code: "Formal", description: "Traje de etiqueta, vestido largo. Evita el blanco por favor." },
        {
          id: "it", type: "itinerary", visible: true,
          items: [
            { time: "16:00", title: "Ceremonia religiosa" },
            { time: "17:30", title: "Cóctel de bienvenida" },
            { time: "19:00", title: "Cena y baile", description: "Abrimos la pista a las 20:00" },
          ],
        },
        {
          id: "gf", type: "giftTable", visible: true,
          items: [
            { name: "Mes de regalos", description: "Lluvia de sobres", url: "https://www.mesaderegalos.com/ana-yluis" },
            { name: "Luna de miel", description: "Contribución para Italia", url: "" },
          ],
        },
        {
          id: "qz", type: "quiz", visible: true, title: "¿Cuánto nos conoces?",
          questions: [
            { id: "q1", question: "¿Dónde se conocieron?", options: ["En la universidad", "En un concierto", "En el trabajo", "Por amigos"] },
            { id: "q2", question: "¿Quién propuso matrimonio?", options: ["Ana", "Luis", "A la vez", "Nadie"] },
          ],
        },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu asistencia", collectEmail: true },
      ],
    },
  };
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

  console.log("== Plantilla demo ==");
  await db.collection("templates").doc("demo-boda").set(demoTemplate(), { merge: true });
  console.log("  [Firestore] /templates/demo-boda");

  console.log("== Config del sitio ==");
  await db.collection("site").doc("config").set(
    {
      heroTitle: "Invitaciones digitales que emocionan",
      heroSubtitle: "Crea invitaciones interactivas para bodas, cumpleaños y más en minutos.",
      heroCta: "Ver plantillas",
      metaDescription: "Invify - Plataforma de invitaciones digitales interactivas con RSVP, música, galería y mapa.",
      updatedAt: Date.now(),
    },
    { merge: true }
  );
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