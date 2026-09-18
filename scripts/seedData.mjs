// ============================================================================
// DATOS del seed (pura data) - compartidos por scripts/seed.mjs (Admin SDK) y
// scripts/seedRest.mjs (Firestore REST API con token OAuth de la sesión).
// Catálogo ampliado: 6 plantillas por categoría (30 totales) muy atractivas.
// ============================================================================

export const PROYECTO_KEY = "invify-online";

export const PLANS = [
  {
    id: "plan_basic",
    name: "Básico",
    price: 15000,
    currency: "mxn",
    interval: "one_time",
    features: ["1 invitación activa", "URL /i/slug propia", "Soporte de 1 tema"],
    entitlement: {
      quota: 1,
      features: { rsvp: false, quiz: false, audio: false, stats: false, allTemplates: false, prioritySupport: false },
    },
  },
  {
    id: "plan_pro",
    name: "Pro",
    price: 32000,
    currency: "mxn",
    interval: "one_time",
    features: ["5 invitaciones activas", "RSVP + Quiz + Música", "Estadísticas de vistas"],
    entitlement: {
      quota: 5,
      features: { rsvp: true, quiz: true, audio: true, stats: true, allTemplates: false, prioritySupport: false },
    },
  },
  {
    id: "plan_premium",
    name: "Premium",
    price: 49000,
    currency: "mxn",
    interval: "month",
    features: ["Invitaciones ilimitadas", "Todo el catálogo de temas", "Soporte prioritario"],
    entitlement: {
      quota: "unlimited",
      features: { rsvp: true, quiz: true, audio: true, stats: true, allTemplates: true, prioritySupport: true },
    },
  },
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

// Helper para crear builderConfig rápido con módulos variables
function baseBuilder({ primaryColor, background, fontFamily = "serif", modules }) {
  return { theme: { primaryColor, background, fontFamily }, modules };
}

// Catálogo completo: 6 por categoría
export const TEMPLATES = [
  // ==================== BODA (6) ====================
  {
    id: "boda-elegance",
    name: "Boda Elegance",
    category: "boda",
    thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    active: true,
    createdAt: Date.now(),
    builderConfig: baseBuilder({
      primaryColor: "#C9A227", background: "#FFFBF2", fontFamily: "serif",
      modules: [
        { id: "pre", type: "preloader", visible: true, text: "Ana & Luis", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80" },
        { id: "hdr", type: "header", visible: true, title: "Nos casamos", names: "Ana & Luis", date: "2026-11-14T16:00:00", subtitle: "Con amor te invitamos a celebrar", imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-11-14T16:00:00", label: "Falta para la boda" },
        { id: "au", type: "audio", visible: true, src: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_2a8ab843f4.mp3", autoplay: false },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", caption: "Propuesta" }, { url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80", caption: "Nuestra historia" }] },
        { id: "lc", type: "location", visible: true, venue: "Hacienda Los Olivos", address: "Km 12 Vía Chía, Colombia", lat: 4.85595, lng: -74.06095, mapUrl: "" },
        { id: "dc", type: "dresscode", visible: true, code: "Formal", description: "Etiqueta rigurosa, evita el blanco.", imageUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "16:00", title: "Ceremonia" }, { time: "17:30", title: "Cóctel" }, { time: "19:00", title: "Fiesta" }] },
        { id: "gf", type: "giftTable", visible: true, items: [{ name: "Lluvia de sobres", url: "" }] },
        { id: "qz", type: "quiz", visible: true, title: "¿Cuánto nos conoces?", questions: [{ id: "q1", question: "¿Dónde se conocieron?", options: ["Universidad", "Concierto", "Trabajo"] }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu asistencia", collectEmail: true },
      ],
    }),
  },
  {
    id: "boda-bohemia",
    name: "Boda Bohemia Atardecer",
    category: "boda",
    thumbnailUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 1,
    builderConfig: baseBuilder({
      primaryColor: "#D98E73", background: "#FFF5EF", fontFamily: "serif",
      modules: [
        { id: "pre", type: "preloader", visible: true, text: "Sofía & Martín", imageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80" },
        { id: "hdr", type: "header", visible: true, title: "Amor bohemio", names: "Sofía & Martín", date: "2026-10-03T17:00:00", subtitle: "Bajo el atardecer, di sí con nosotros", imageUrl: "https://images.unsplash.com/photo-1507504031001-f536a28cb711?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-10-03T17:00:00", label: "Cuenta regresiva" },
        { id: "au", type: "audio", visible: false, src: "" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1507504031001-f536a28cb711?w=800&q=80" }, { url: "https://images.unsplash.com/photo-1469370083565-98195a619566?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Playa del Cielo, Tulum", address: "Tulum, Quintana Roo", lat: 20.211, lng: -87.465, mapUrl: "" },
        { id: "dc", type: "dresscode", visible: true, code: "Boho Chic", description: "Lino, flores y pies descalzos.", imageUrl: "https://images.unsplash.com/photo-1520854221256-589c141616bf?w=600&q=80" },
        { id: "rs", type: "rsvp", visible: true, title: "¿Vienes a celebrar?", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "Nuestro viaje", questions: [{ id: "q1", question: "¿Primer viaje juntos?", options: ["Tulum", "CDMX", "Oaxaca"] }] },
      ],
    }),
  },
  {
    id: "boda-moderna",
    name: "Boda Minimal Moderna",
    category: "boda",
    thumbnailUrl: "https://images.unsplash.com/photo-1520854221256-589c141616bf?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1520854221256-589c141616bf?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 2,
    builderConfig: baseBuilder({
      primaryColor: "#2C2C2C", background: "#F7F7F7", fontFamily: "sans",
      modules: [
        { id: "pre", type: "preloader", visible: true, text: "M & J", imageUrl: "" },
        { id: "hdr", type: "header", visible: true, title: "Minimal love", names: "María & Jorge", date: "2026-09-20T18:00:00", subtitle: "Menos es más", imageUrl: "https://images.unsplash.com/photo-1520854221256-589c141616bf?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-20T18:00:00", label: "Save the date" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Loft 22, CDMX", address: "Roma Norte, CDMX", lat: 19.419, lng: -99.164, mapUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "18:00", title: "Ceremonia civil" }, { time: "20:00", title: "Cena minimal" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
        { id: "qz", type: "quiz", visible: false, title: "Quiz", questions: [] },
      ],
    }),
  },
  {
    id: "boda-jardin",
    name: "Boda Jardín Romántico",
    category: "boda",
    thumbnailUrl: "https://images.unsplash.com/photo-1469370083565-98195a619566?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1469370083565-98195a619566?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 3,
    builderConfig: baseBuilder({
      primaryColor: "#7BA17D", background: "#F0F7F0", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Jardín de amor", names: "Valeria & Andrés", date: "2026-05-17T15:30:00", subtitle: "Entre flores y promesas", imageUrl: "https://images.unsplash.com/photo-1469370083565-98195a619566?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-05-17T15:30:00", label: "Florece nuestro día" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1469370083565-98195a619566?w=800&q=80" }, { url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Jardín Botánico, Bogotá", address: "Calle 63, Bogotá", lat: 4.657, lng: -74.099, mapUrl: "" },
        { id: "dc", type: "dresscode", visible: true, code: "Garden Party", imageUrl: "" },
        { id: "au", type: "audio", visible: true, src: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu asistencia", collectEmail: true },
      ],
    }),
  },
  {
    id: "boda-dorada",
    name: "Boda Clásica Dorada",
    category: "boda",
    thumbnailUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 4,
    builderConfig: baseBuilder({
      primaryColor: "#B8860B", background: "#FFF8E7", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Elegancia eterna", names: "Isabella & Carlos", date: "2026-12-06T19:00:00", subtitle: "Una noche dorada para recordar", imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-12-06T19:00:00", label: "Gala nupcial" },
        { id: "lc", type: "location", visible: true, venue: "Salón Imperial", address: "Polanco, CDMX", lat: 19.432, lng: -99.196, mapUrl: "" },
        { id: "dc", type: "dresscode", visible: true, code: "Etiqueta", description: "Gala: traje oscuro y vestido largo." },
        { id: "gf", type: "giftTable", visible: true, items: [{ name: "Mesa Liverpool", url: "https://www.liverpool.com.mx" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "Historia dorada", questions: [{ id: "q1", question: "¿Años juntos?", options: ["5", "7", "10"] }] },
      ],
    }),
  },
  {
    id: "boda-noche",
    name: "Boda Noche Estrellada",
    category: "boda",
    thumbnailUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 5,
    builderConfig: baseBuilder({
      primaryColor: "#A78BFA", background: "#0F0F1E", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Bajo las estrellas", names: "Luna & Diego", date: "2026-08-08T20:00:00", subtitle: "Una ceremonia nocturna mágica", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-08-08T20:00:00", label: "Brillará nuestra noche" },
        { id: "au", type: "audio", visible: true, src: "" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Terraza Cielo, Guadalajara", address: "Zapopan, Jalisco", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu presencia", collectEmail: true },
      ],
    }),
  },
  // ==================== CUMPLEAÑOS (6) ====================
  {
    id: "cumple-neon",
    name: "Cumple Neon Fiesta",
    category: "cumpleanos",
    thumbnailUrl: "https://images.unsplash.com/photo-1530103864456-1102a3a56a6e?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1530103864456-1102a3a56a6e?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 10,
    builderConfig: baseBuilder({
      primaryColor: "#FF2E93", background: "#120012", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "¡Fiesta Neon!", names: "¡Cumple de Sofi - 25!", date: "2026-07-12T21:00:00", subtitle: "Brilla con nosotros", imageUrl: "https://images.unsplash.com/photo-1530103864456-1102a3a56a6e?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-07-12T21:00:00", label: "Falta poco" },
        { id: "au", type: "audio", visible: true, src: "" },
        { id: "lc", type: "location", visible: true, venue: "Rooftop Neon, CDMX", address: "Condesa, CDMX", lat: 19.418, lng: -99.178, mapUrl: "" },
        { id: "gf", type: "giftTable", visible: true, items: [{ name: "Regalos", description: "¡Tu presencia es el regalo!" }] },
        { id: "qz", type: "quiz", visible: true, title: "Trivia Sofi", questions: [{ id: "q1", question: "Color favorito?", options: ["Neon rosa", "Azul", "Verde"] }] },
        { id: "rs", type: "rsvp", visible: true, title: "¿Vienes?", collectEmail: false },
      ],
    }),
  },
  {
    id: "cumple-jardin-infantil",
    name: "Cumple Jardín Infantil",
    category: "cumpleanos",
    thumbnailUrl: "https://images.unsplash.com/photo-1464343935686-299d816f80a8?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1464343935686-299d816f80a8?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 11,
    builderConfig: baseBuilder({
      primaryColor: "#77C687", background: "#FFF9E6", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "¡Fiesta en el jardín!", names: "Mateo cumple 5", date: "2026-04-18T15:00:00", subtitle: "Dinosaurios y pastel", imageUrl: "https://images.unsplash.com/photo-1464343935686-299d816f80a8?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-04-18T15:00:00", label: "Cuenta regresiva dino" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1464343935686-299d816f80a8?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Jardín La Casita, Puebla", address: "Puebla, Pue.", lat: 19.041, lng: -98.206, mapUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "15:00", title: "Piñata" }, { time: "16:30", title: "Pastel" }, { time: "17:30", title: "Show" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: false },
      ],
    }),
  },
  {
    id: "cumple-elegante",
    name: "Cumple Elegante Adulto",
    category: "cumpleanos",
    thumbnailUrl: "https://images.unsplash.com/photo-1530104188501-82a81d4260e2?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1530104188501-82a81d4260e2?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 12,
    builderConfig: baseBuilder({
      primaryColor: "#3A2D4A", background: "#F5F0FF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Noche elegante", names: "40 años de Claudia", date: "2026-09-05T20:00:00", subtitle: "Cóctel & jazz", imageUrl: "https://images.unsplash.com/photo-1530104188501-82a81d4260e2?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-05T20:00:00", label: "Gran noche" },
        { id: "dc", type: "dresscode", visible: true, code: "Cóctel elegante", imageUrl: "" },
        { id: "lc", type: "location", visible: true, venue: "Casa Palmera, Mérida", address: "Mérida, Yucatán", lat: 20.97, lng: -89.62, mapUrl: "" },
        { id: "au", type: "audio", visible: false, src: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "¿Conoces a Claudia?", questions: [{ id: "q1", question: "¿Hobby?", options: ["Viajar", "Cocinar", "Leer"] }] },
      ],
    }),
  },
  {
    id: "cumple-tropical",
    name: "Cumple Tropical Paradise",
    category: "cumpleanos",
    thumbnailUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 13,
    builderConfig: baseBuilder({
      primaryColor: "#FF6B35", background: "#FFF3E0", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "¡Aloha 30!", names: "Fiesta tropical de Dani", date: "2026-06-28T16:00:00", subtitle: "Palmeras, alberca y sol", imageUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-06-28T16:00:00", label: "Aloha countdown" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Quinta Tropical, Cuernavaca", address: "Cuernavaca, Morelos", lat: 18.924, lng: -99.221, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
      ],
    }),
  },
  {
    id: "cumple-vintage",
    name: "Cumple Vintage Retro",
    category: "cumpleanos",
    thumbnailUrl: "https://images.unsplash.com/photo-1503453154233-5d78f8903af8?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1503453154233-5d78f8903af8?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 14,
    builderConfig: baseBuilder({
      primaryColor: "#8B4513", background: "#FFF8DC", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Retro 50's", names: "¡50 de Roberto!", date: "2026-08-15T19:30:00", subtitle: "Vinilos y rock & roll", imageUrl: "https://images.unsplash.com/photo-1503453154233-5d78f8903af8?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-08-15T19:30:00", label: "Back to the 70s" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "19:30", title: "Bienvenida retro" }, { time: "21:00", title: "Banda en vivo" }] },
        { id: "lc", type: "location", visible: true, venue: "Salón Vinilo, GDL", address: "Guadalajara, Jal.", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "au", type: "audio", visible: true, src: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  {
    id: "cumple-glam",
    name: "Cumple Glam Dorado",
    category: "cumpleanos",
    thumbnailUrl: "https://images.unsplash.com/photo-1511795407614-41164cbe4e8c?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1511795407614-41164cbe4e8c?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 15,
    builderConfig: baseBuilder({
      primaryColor: "#C0A030", background: "#FFFDF0", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Glam Night", names: "¡30 de Valentina!", date: "2026-11-22T21:00:00", subtitle: "Brillo, glam y champagne", imageUrl: "https://images.unsplash.com/photo-1511795407614-41164cbe4e8c?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-11-22T21:00:00", label: "Glam countdown" },
        { id: "dc", type: "dresscode", visible: true, code: "Glam / Brillos", imageUrl: "" },
        { id: "lc", type: "location", visible: true, venue: "Terraza Gold, Monterrey", address: "San Pedro, NL", lat: 25.658, lng: -100.367, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu glam", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "Trivia Glam", questions: [{ id: "q1", question: "¿Color favorito de Vale?", options: ["Dorado", "Rosa", "Negro"] }] },
      ],
    }),
  },
  // ==================== BABYSHOWER (6) ====================
  {
    id: "babyshower-nubes",
    name: "Babyshower Nubes Suaves",
    category: "babyshower",
    thumbnailUrl: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 20,
    builderConfig: baseBuilder({
      primaryColor: "#8ECAE6", background: "#F0FAFF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "¡Bebé en camino!", names: "Esperando a Emma", date: "2026-06-14T16:00:00", subtitle: "Lluvia de amor entre nubes", imageUrl: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-06-14T16:00:00", label: "Llega Emma" },
        { id: "lc", type: "location", visible: true, venue: "Casa Nube, Querétaro", address: "Querétaro, Qro.", lat: 20.588, lng: -100.389, mapUrl: "" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=800&q=80" }] },
        { id: "gf", type: "giftTable", visible: true, items: [{ name: "Lista Amazon Baby", url: "https://amazon.com/baby" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu asistencia", collectEmail: false },
        { id: "qz", type: "quiz", visible: true, title: "¿Niño o niña?", questions: [{ id: "q1", question: "¿Nombre?", options: ["Emma", "Sofi"] }] },
      ],
    }),
  },
  {
    id: "babyshower-selva",
    name: "Babyshower Selva Baby",
    category: "babyshower",
    thumbnailUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 21,
    builderConfig: baseBuilder({
      primaryColor: "#5FA052", background: "#F3FFF0", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "¡Selva de amor!", names: "Baby León", date: "2026-07-05T15:00:00", subtitle: "Rugidos de ternura", imageUrl: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-07-05T15:00:00", label: "Llega el leoncito" },
        { id: "lc", type: "location", visible: true, venue: "Jardín Selva, Cuernavaca", address: "Cuernavaca, Mor.", lat: 18.928, lng: -99.221, mapUrl: "" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=800&q=80" }] },
        { id: "rs", type: "rsvp", visible: true, title: "¿Vienes a rugir?", collectEmail: false },
      ],
    }),
  },
  {
    id: "babyshower-elefantito",
    name: "Babyshower Elefantito Gris",
    category: "babyshower",
    thumbnailUrl: "https://images.unsplash.com/photo-1503453005815-12897dc2d1ed?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1503453005815-12897dc2d1ed?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 22,
    builderConfig: baseBuilder({
      primaryColor: "#9CA3AF", background: "#F9FAFB", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Pequeño elefantito", names: "Babyshower de Noah", date: "2026-05-30T16:30:00", subtitle: "Grandes sueños, pequeño corazón", imageUrl: "https://images.unsplash.com/photo-1503453005815-12897dc2d1ed?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-05-30T16:30:00", label: "Llega Noah" },
        { id: "lc", type: "location", visible: true, venue: "Salón Gris Perla, Puebla", address: "Puebla", lat: 19.041, lng: -98.206, mapUrl: "" },
        { id: "gf", type: "giftTable", visible: true, items: [{ name: "Mesa elefantito", url: "" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "Adivina", questions: [{ id: "q1", question: "¿Peso estimado?", options: ["3kg", "3.5kg", "4kg"] }] },
      ],
    }),
  },
  {
    id: "babyshower-arcoiris",
    name: "Babyshower Arcoíris Pastel",
    category: "babyshower",
    thumbnailUrl: "https://images.unsplash.com/photo-1490094532191-9d8e70afd0a5?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1490094532191-9d8e70afd0a5?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 23,
    builderConfig: baseBuilder({
      primaryColor: "#F4A7B9", background: "#FFF0F5", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Arcoíris de amor", names: "¡Hola Mía!", date: "2026-08-12T17:00:00", subtitle: "Colores y dulzura", imageUrl: "https://images.unsplash.com/photo-1490094532191-9d8e70afd0a5?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-08-12T17:00:00", label: "Brilla Mía" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1490094532191-9d8e70afd0a5?w=800&q=80" }, { url: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Terraza Arcoíris, GDL", address: "Guadalajara", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
      ],
    }),
  },
  {
    id: "babyshower-bosque",
    name: "Babyshower Bosque Encantado",
    category: "babyshower",
    thumbnailUrl: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 24,
    builderConfig: baseBuilder({
      primaryColor: "#6B7B5E", background: "#F5F7F0", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Bosque mágico", names: "Esperando a Luca", date: "2026-09-14T15:00:00", subtitle: "Hadas y duendecillos", imageUrl: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-14T15:00:00", label: "Magia en camino" },
        { id: "lc", type: "location", visible: true, venue: "Bosque Escondido, Valle", address: "Valle de Bravo", lat: 19.193, lng: -100.13, mapUrl: "" },
        { id: "au", type: "audio", visible: false, src: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: false },
        { id: "qz", type: "quiz", visible: true, title: "Trivia bosque", questions: [{ id: "q1", question: "¿Animal favorito?", options: ["Zorro", "Búho", "Ciervo"] }] },
      ],
    }),
  },
  {
    id: "babyshower-dulce",
    name: "Babyshower Dulce Rosa",
    category: "babyshower",
    thumbnailUrl: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 25,
    builderConfig: baseBuilder({
      primaryColor: "#E9A6B8", background: "#FFF5F8", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Dulce espera", names: "Babyshower de Isabella", date: "2026-07-20T16:00:00", subtitle: "La princesa llega", imageUrl: "https://images.unsplash.com/photo-1520854221256-589c141616bf?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-07-20T16:00:00", label: "Dulce espera" },
        { id: "lc", type: "location", visible: true, venue: "Casa Rosa, CDMX", address: "Coyoacán, CDMX", lat: 19.346, lng: -99.161, mapUrl: "" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1520854221256-589c141616bf?w=800&q=80" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  // ==================== BAUTIZO (6) ====================
  {
    id: "bautizo-angel",
    name: "Bautizo Ángel Celestial",
    category: "bautizo",
    thumbnailUrl: "https://images.unsplash.com/photo-1503453005815-12897dc2d1ed?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1503453005815-12897dc2d1ed?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 30,
    builderConfig: baseBuilder({
      primaryColor: "#A8C0E0", background: "#F2F7FF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Bautizo celestial", names: "Ángel Gabriel", date: "2026-06-07T12:00:00", subtitle: "Dios te bendiga", imageUrl: "https://images.unsplash.com/photo-1503453005815-12897dc2d1ed?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-06-07T12:00:00", label: "Bendición" },
        { id: "lc", type: "location", visible: true, venue: "Parroquia San Ángel, CDMX", address: "San Ángel, CDMX", lat: 19.345, lng: -99.188, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: false },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "12:00", title: "Misa" }, { time: "14:00", title: "Comida familiar" }] },
      ],
    }),
  },
  {
    id: "bautizo-clasico",
    name: "Bautizo Clásico Blanco",
    category: "bautizo",
    thumbnailUrl: "https://images.unsplash.com/photo-1490094532191-9d8e70afd0a5?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1490094532191-9d8e70afd0a5?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 31,
    builderConfig: baseBuilder({
      primaryColor: "#D4C5B0", background: "#FFFEFB", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Mi Bautizo", names: "Sofía Victoria", date: "2026-07-11T11:00:00", subtitle: "Con fé y amor", imageUrl: "https://images.unsplash.com/photo-1490094532191-9d8e70afd0a5?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-07-11T11:00:00", label: "Día sagrado" },
        { id: "lc", type: "location", visible: true, venue: "Catedral de Puebla", address: "Centro, Puebla", lat: 19.042, lng: -98.198, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  {
    id: "bautizo-acuarela",
    name: "Bautizo Acuarela Suave",
    category: "bautizo",
    thumbnailUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 32,
    builderConfig: baseBuilder({
      primaryColor: "#B8D8E8", background: "#FFF9F0", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Acuarela de fe", names: "Bautizo de Luna", date: "2026-08-09T12:30:00", subtitle: "Colores de bendición", imageUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-08-09T12:30:00", label: "Cuenta regresiva" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Capilla Acuarela, Querétaro", address: "Querétaro", lat: 20.588, lng: -100.389, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
      ],
    }),
  },
  {
    id: "bautizo-principe",
    name: "Bautizo Pequeño Príncipe",
    category: "bautizo",
    thumbnailUrl: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 33,
    builderConfig: baseBuilder({
      primaryColor: "#6C5B7B", background: "#F8F5FF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Mi Principito", names: "Bautizo de Leo", date: "2026-05-16T12:00:00", subtitle: "Corona y amor", imageUrl: "https://images.unsplash.com/photo-1519689680058-84b0162ac58c?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-05-16T12:00:00", label: "Coronación" },
        { id: "dc", type: "dresscode", visible: false, code: "", imageUrl: "" },
        { id: "lc", type: "location", visible: true, venue: "Parroquia del Príncipe, GDL", address: "Guadalajara", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  {
    id: "bautizo-luz",
    name: "Bautizo Luz Divina",
    category: "bautizo",
    thumbnailUrl: "https://images.unsplash.com/photo-1464343935686-299d816f80a8?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1464343935686-299d816f80a8?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 34,
    builderConfig: baseBuilder({
      primaryColor: "#F9D56E", background: "#FFFEF0", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Luz divina", names: "Bautizo de Alana", date: "2026-09-20T11:30:00", subtitle: "Que tu luz brille", imageUrl: "https://images.unsplash.com/photo-1464343935686-299d816f80a8?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-20T11:30:00", label: "Luz en camino" },
        { id: "lc", type: "location", visible: true, venue: "Iglesia Luz, Monterrey", address: "Monterrey, NL", lat: 25.675, lng: -100.316, mapUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "11:30", title: "Ceremonia" }, { time: "13:00", title: "Brindis" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
      ],
    }),
  },
  {
    id: "bautizo-floral",
    name: "Bautizo Floral Pastel",
    category: "bautizo",
    thumbnailUrl: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 35,
    builderConfig: baseBuilder({
      primaryColor: "#E8A0BF", background: "#FFF6FA", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Flores de bendición", names: "Bautizo de Mila", date: "2026-10-11T12:00:00", subtitle: "Florece con fe", imageUrl: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-10-11T12:00:00", label: "Florece" },
        { id: "lc", type: "location", visible: true, venue: "Jardín Floral, Xochimilco", address: "CDMX", lat: 19.275, lng: -99.094, mapUrl: "" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=800&q=80" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  // ==================== CORPORATIVO (6) ====================
  {
    id: "corp-tech",
    name: "Corporativo Tech Conference",
    category: "corporativo",
    thumbnailUrl: "https://images.unsplash.com/photo-1515182626482-d2f8d29d2f1a?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1515182626482-d2f8d29d2f1a?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 40,
    builderConfig: baseBuilder({
      primaryColor: "#2563EB", background: "#F0F6FF", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Tech Summit 2026", names: "Invitación Corporativa", date: "2026-10-22T09:00:00", subtitle: "Innovación sin límites", imageUrl: "https://images.unsplash.com/photo-1515182626482-d2f8d29d2f1a?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-10-22T09:00:00", label: "Falta para el summit" },
        { id: "lc", type: "location", visible: true, venue: "Centro Citibanamex, CDMX", address: "CDMX", lat: 19.428, lng: -99.203, mapUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "09:00", title: "Registro" }, { time: "10:00", title: "Keynote" }, { time: "13:00", title: "Networking lunch" }] },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1515182626482-d2f8d29d2f1a?w=800&q=80" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "Networking quiz", questions: [{ id: "q1", question: "¿Área de interés?", options: ["AI", "Cloud", "Blockchain"] }] },
      ],
    }),
  },
  {
    id: "corp-gala",
    name: "Corporativo Gala Negocios",
    category: "corporativo",
    thumbnailUrl: "https://images.unsplash.com/photo-1497366216548-375692473f07?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1497366216548-375692473f07?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 41,
    builderConfig: baseBuilder({
      primaryColor: "#0F172A", background: "#F8FAFC", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Gala Anual", names: "Premios Empresariales 2026", date: "2026-11-28T20:00:00", subtitle: "Celebrando la excelencia", imageUrl: "https://images.unsplash.com/photo-1497366216548-375692473f07?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-11-28T20:00:00", label: "Gala" },
        { id: "dc", type: "dresscode", visible: true, code: "Gala - Traje oscuro", imageUrl: "" },
        { id: "lc", type: "location", visible: true, venue: "Hotel Four Seasons, CDMX", address: "Polanco, CDMX", lat: 19.425, lng: -99.194, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu lugar", collectEmail: true },
        { id: "gf", type: "giftTable", visible: false, items: [] },
      ],
    }),
  },
  {
    id: "corp-lanzamiento",
    name: "Corporativo Lanzamiento Producto",
    category: "corporativo",
    thumbnailUrl: "https://images.unsplash.com/photo-1440775466045-52b279a4f82a?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1440775466045-52b279a4f82a?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 42,
    builderConfig: baseBuilder({
      primaryColor: "#9333EA", background: "#FAF5FF", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "¡Nuevo lanzamiento!", names: "Producto X - Reveal", date: "2026-09-10T18:30:00", subtitle: "El futuro es ahora", imageUrl: "https://images.unsplash.com/photo-1440775466045-52b279a4f82a?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-10T18:30:00", label: "Reveal" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1440775466045-52b279a4f82a?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Showroom Central, GDL", address: "Guadalajara", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "rs", type: "rsvp", visible: true, title: "Reserva tu lugar", collectEmail: true },
      ],
    }),
  },
  {
    id: "corp-networking",
    name: "Corporativo Networking Cocktail",
    category: "corporativo",
    thumbnailUrl: "https://images.unsplash.com/photo-1513151235217-d6d16e1bff22?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1513151235217-d6d16e1bff22?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 43,
    builderConfig: baseBuilder({
      primaryColor: "#059669", background: "#ECFDF5", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Networking Cocktail", names: "Conecta & Crece", date: "2026-08-20T18:00:00", subtitle: "Cóctel ejecutivo", imageUrl: "https://images.unsplash.com/photo-1513151235217-d6d16e1bff22?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-08-20T18:00:00", label: "Networking" },
        { id: "lc", type: "location", visible: true, venue: "Terraza Reforma, CDMX", address: "Reforma 222, CDMX", lat: 19.426, lng: -99.167, mapUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "18:00", title: "Bienvenida" }, { time: "19:00", title: "Pitch 1-min" }, { time: "20:30", title: "Cóctel libre" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "¿Qué buscas?", questions: [{ id: "q1", question: "¿Buscas?", options: ["Inversión", "Clientes", "Talento"] }] },
      ],
    }),
  },
  {
    id: "corp-anual",
    name: "Corporativo Anual Formal",
    category: "corporativo",
    thumbnailUrl: "https://images.unsplash.com/photo-1511795407614-41164cbe4e8c?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1511795407614-41164cbe4e8c?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 44,
    builderConfig: baseBuilder({
      primaryColor: "#334155", background: "#F1F5F9", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Reunión Anual", names: "Grupo Invify 2026", date: "2026-12-12T10:00:00", subtitle: "Resultados y visión 2027", imageUrl: "https://images.unsplash.com/photo-1511795407614-41164cbe4e8c?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-12-12T10:00:00", label: "Reunión anual" },
        { id: "lc", type: "location", visible: true, venue: "Auditorio Corporativo, Monterrey", address: "Monterrey, NL", lat: 25.675, lng: -100.316, mapUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "10:00", title: "Apertura" }, { time: "11:30", title: "Resultados" }, { time: "13:00", title: "Brindis" }] },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: true },
      ],
    }),
  },
  {
    id: "corp-startup",
    name: "Corporativo Startup Creativa",
    category: "corporativo",
    thumbnailUrl: "https://images.unsplash.com/photo-1531682427090-d154d4bc8c6e?w=800&q=80",
    previewUrl: "https://images.unsplash.com/photo-1531682427090-d154d4bc8c6e?w=1200&q=80",
    active: true,
    createdAt: Date.now() + 45,
    builderConfig: baseBuilder({
      primaryColor: "#F97316", background: "#FFF7ED", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Startup Pitch Night", names: "Invify Demo Day", date: "2026-07-30T18:00:00", subtitle: "Ideas que cambian el mundo", imageUrl: "https://images.unsplash.com/photo-1531682427090-d154d4bc8c6e?w=1200&q=80" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-07-30T18:00:00", label: "Demo Day" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "https://images.unsplash.com/photo-1531682427090-d154d4bc8c6e?w=800&q=80" }] },
        { id: "lc", type: "location", visible: true, venue: "Campus Creativo, CDMX", address: "Santa Fe, CDMX", lat: 19.357, lng: -99.278, mapUrl: "" },
        { id: "qz", type: "quiz", visible: true, title: "¿Qué startup eres?", questions: [{ id: "q1", question: "¿Etapa?", options: ["Idea", "MVP", "Escalando"] }] },
        { id: "rs", type: "rsvp", visible: true, title: "Reserva tu pitch", collectEmail: true },
      ],
    }),
  },
];

export function demoTemplate() {
  return TEMPLATES[0];
}

export function allTemplates() {
  return TEMPLATES;
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
