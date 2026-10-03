/**
 * Crea las publicaciones base del CMS (/pages) que antes no existian.
 *
 * Estas paginas se administraban desde /admin/pages pero no tenian ruta
 * publica, asi que cualquier enlace a ellas daba 404. El script solo crea las
 * que faltan: si el slug ya existe no lo toca.
 *
 * Ejecutar:  node scripts/seed-pages.cjs
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

const THEME = {
  primaryColor: "#C9A227",
  background: "#FFFBF2",
  textColor: "#1F2937",
  fontFamily: "serif",
};

const hero = (title, subtitle) => ({
  id: `hdr_${Math.random().toString(36).slice(2, 9)}`,
  type: "header",
  visible: true,
  title,
  subtitle,
  names: "",
  date: "",
  imageUrl: "",
});

const text = (id, title, content, align = "center") => ({
  id: `txt_${id}`,
  type: "text",
  visible: true,
  title,
  content,
  align,
});

const PAGES = [
  {
    slug: "/nosotros",
    title: "Nosotros",
    seoTitle: "Nosotros · Invify",
    metaDescription:
      "Invify crea invitaciones digitales interactivas para bodas, cumpleaños y baby showers. Diseño elegante y RSVP en un clic.",
    modules: [
      hero("Invitaciones que se sienten tuyas", "Sobre Invify"),
      text(
        "n1",
        "Qué hacemos",
        `<p>Nacimos para quitarle fricción a un momento que solo debería dar alegría: tu evento.</p>
<p>Combinamos diseño elegante con tecnología sencilla. Eliges una plantilla, escribes tus datos, compartes el enlace y listo: tus invitados confirman asistencia, ven la ubicación, consultan el itinerario y te dejan un mensaje, todo desde el móvil y sin instalar nada.</p>`,
      ),
      text(
        "n2",
        "Nuestra idea",
        `<p>Una invitación digital bien hecha no es un trámite: es la primera impresión de tu evento y la forma más cómoda de confirmar asistencia.</p>
<p>Por eso cada plantilla está pensada para leerse en pantalla, para cargarse rápido en datos móviles y para que cada invitado encuentre en un solo toque lo que necesita.</p>`,
      ),
    ],
  },
  {
    slug: "/servicios",
    title: "Servicios",
    seoTitle: "Servicios · Invify",
    metaDescription:
      "Invitaciones digitales para bodas, cumpleaños, baby showers, bautizos y eventos corporativos. Personalizables y con RSVP.",
    modules: [
      hero("Un invitación para cada celebración", "Servicios"),
      text(
        "s1",
        "Bodas",
        `<p>Portada con los nombres, cuenta regresiva, itinerario hora por hora, mapa del lugar, código de vestimenta y mesa de regalos.</p>`,
        "left",
      ),
      text(
        "s2",
        "Cumpleaños",
        `<p>Portada festiva, cuenta regresiva, juegos interactivos y confirmación en dos toques.</p>`,
        "left",
      ),
      text(
        "s3",
        "Baby showers y bautizos",
        `<p>Dulces combinaciones de detalles, mensajes de buenos deseos y lista de regalos para la mamá o el bebé.</p>`,
        "left",
      ),
      text(
        "s4",
        "Eventos corporativos",
        `<p>Presentaciones de producto, lanzamientos y kickoff de ventas con registro de asistentes y materiales descargables.</p>`,
        "left",
      ),

      text(
        "s5",
        "Todo incluido",
        `<ul>
<li>Plantillas con diseño profesional</li>
<li>Confirmación de asistencia (RSVP) con notificaciones</li>
<li>Galería de fotos y música</li>
<li>Personalización de colores y textos</li>
<li>Estadísticas de quién vio y quién confirmó</li>
</ul>`,
      ),
    ],
  },
  {
    slug: "/como-funciona",
    title: "Cómo funciona",
    seoTitle: "Cómo funciona · Invify",
    metaDescription:
      "Crea tu invitación digital en tres pasos: elige plantilla, personaliza y comparte el enlace. Sin conocimientos técnicos.",
    modules: [
      hero("Lista en tres pasos", "Cómo funciona"),
      text(
        "c1",
        "1. Elige tu plantilla",
        `<p>Explora el catálogo y escoge la que más se parezca a tu evento: boda, cumpleaños, baby shower o corporativo.</p>`,
      ),
      text(
        "c2",
        "2. Personaliza",
        `<p>Cambia los textos, los colores y las fotos. Añade fecha, lugar, itinerario y dress code si los necesitas.</p>`,
      ),
      text(
        "c3",
        "3. Comparte",
        `<p>Comparte el enlace por WhatsApp, Instagram o código QR. Tus invitados abren, confirman y listo.</p>`,
      ),
    ],
  },
  {
    slug: "/preguntas-frecuentes",
    title: "Preguntas frecuentes",
    seoTitle: "Preguntas frecuentes · Invify",
    metaDescription:
      "Resolvemos las dudas más comunes sobre invitaciones digitales Invify: Confirmación, pagos, cambios y soporte.",
    modules: [
      hero("Dudas frecuentes", "Ayuda"),
      text(
        "f1",
        "¿Los invitados necesitan instalar algo?",
        `<p>No. La invitación se abre en el navegador del móvil o computadora. No hay app ni registro previo.</p>`,
        "left",
      ),
      text(
        "f2",
        "¿Puedo ver quién confirmó?",
        `<p>Sí. En tu panel verás quién abrió la invitación, quién confirmó y el mensaje que dejó.</p>`,
        "left",
      ),
      text(
        "f3",
        "¿Se puede modificar después?",
        `<p>Sí, puedes editar textos, colores e imágenes incluso después de haber compartido el enlace.</p>`,
        "left",
      ),
      text(
        "f4",
        "¿Qué pasa si se me pasa la fecha?",
        `<p>Puedes cambiar la fecha del evento cuando quieras; la cuenta regresiva se actualiza sola.</p>`,
        "left",
      ),
      text(
        "f5",
        "¿Necesito tarjeta para pagar?",
        `<p>No. Aceptamos tarjeta (Stripe), PayPal y Mercado Pago. También puedes pagar por transferencia si lo prefieres.</p>`,
        "left",
      ),
    ],
  },
];

(async () => {
  const E = loadEnv();
  const { cert, initializeApp } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  const app = initializeApp({
    credential: cert({
      projectId: E.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: E.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (E.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
  const db = getFirestore(app);

  const existing = await db.collection("pages").get();
  const bySlug = new Map();
  for (const d of existing.docs) {
    bySlug.set(String(d.data().slug || "").toLowerCase().replace(/\/+$/, ""), d.id);
  }

  let creados = 0;
  let saltados = 0;

  for (const p of PAGES) {
    const key = p.slug.toLowerCase();
    if (bySlug.has(key)) {
      console.log(`  = ${p.slug} ya existe, no se toca`);
      saltados++;
      continue;
    }
    await db.collection("pages").add({
      slug: p.slug,
      title: p.title,
      seoTitle: p.seoTitle,
      metaDescription: p.metaDescription,
      metaImage: "",
      builderConfig: { modules: p.modules, theme: { ...THEME } },
      status: "published",
      isHome: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    console.log(`  + ${p.slug} creada y publicada`);
    creados++;
  }

  console.log(`\n${creados} creadas, ${saltados} ya existian.`);
  await app.delete();
  process.exit(0);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});