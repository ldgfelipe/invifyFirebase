// ============================================================================
// DATOS del seed (pura data) - compartidos por scripts/seed.mjs (Admin SDK) y
// scripts/seedRest.mjs (Firestore REST API con token OAuth de la sesión).
// ============================================================================

export const PROYECTO_KEY = "invify-online";

export const PLANS = [
  { id: "plan_basic", name: "Básico", price: 900, features: ["1 invitación activa", "URL /i/slug propia", "Soporte de 1 tema"] },
  { id: "plan_pro", name: "Pro", price: 1900, features: ["5 invitaciones activas", "RSVP + Quiz + Música", "Estadísticas de vistas"] },
  { id: "plan_premium", name: "Premium", price: 2900, features: ["Invitaciones ilimitadas", "Todo el catálogo de temas", "Soporte prioritario"] },
];

export function siteConfig() {
  return {
    heroTitle: "Invitaciones digitales que emocionan",
    heroSubtitle: "Crea invitaciones interactivas para bodas, cumpleaños y más en minutos.",
    heroCta: "Ver plantillas",
    metaDescription: "Invify - Plataforma de invitaciones digitales interactivas con RSVP, música, galería y mapa.",
    updatedAt: Date.now(),
  };
}

export function demoTemplate() {
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

// ----------------------------- REST helpers --------------------------------
export function toFirestoreValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return { nullValue: null };
  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "number":
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case "boolean":
      return { booleanValue: value };
    case "bigint":
      return { integerValue: value.toString() };
    case "object":
      if (seen.has(value)) throw new Error("Ciclo detectado");
      seen.add(value);
      if (Array.isArray(value)) {
        return { arrayValue: { values: value.map((v) => toFirestoreValue(v, seen)) } };
      }
      const mapValue = {};
      for (const [k, v] of Object.entries(value)) mapValue[k] = toFirestoreValue(v, seen);
      return { mapValue: { fields: mapValue } };
    default:
      return { stringValue: String(value) };
  }
}

export function toDocPath(collection, id) {
  return `projects/${PROYECTO_KEY}/databases/(default)/documents/${collection}/${id}`;
}