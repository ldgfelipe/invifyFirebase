// ============================================================================
// DATOS del seed - PROPUESTA PROFESIONAL LOCAL (no pusheada)
// 30 plantillas (6 por categoría) diseñadas como diseñador web + experto eventos
// Tipografía intencional: serif = elegancia/tradición, sans = moderno/juvenil
// Estilos drásticos por módulo via ModuleStyle + fondos con imagen
// ============================================================================

export const PROYECTO_KEY = "invify-online";

export const PLANS = [
  {
    id: "plan_basic",
    name: "Básico",
    name_en: "Basic",
    price: 15000,
    price_usd: 7500, // ~75 USD (aprox 15000 MXN / 20)
    price_idr: 2500000, // ~25000 IDR (aprox 15000 MXN / 20)
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
    name_en: "Pro",
    price: 32000,
    price_usd: 1600, // ~160 USD (aprox 32000 MXN / 20)
    price_idr: 5300000, // ~53000 IDR (aprox 32000 MXN / 20)
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
    name_en: "Premium",
    price: 49000,
    price_usd: 2450, // ~245 USD (aprox 49000 MXN / 20)
    price_idr: 8100000, // ~81000 IDR (aprox 49000 MXN / 20)
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
    heroTitle: "Invitaciones que se sienten como el evento",
    heroTitle_en: "Invitations that feel like the event",
    heroSubtitle: "Diseño editorial, tipografía con intención y experiencia móvil impecable. Elige, personaliza y comparte en 3 clics.",
    heroSubtitle_en: "Editorial design, intentional typography and flawless mobile experience. Choose, customize and share in 3 clicks.",
    heroCta: "Explorar catálogo profesional",
    heroCta_en: "Browse professional catalog",
    // Nuevas imágenes hero para modo English/local
    heroBackgroundImage: "/api/thumb/lock/1", // Imagen principal hero (SVG local)
    heroBackgroundImage_en: "/api/thumb/lock/1", // Hero image for English mode
    // Catálogo por defecto: imágenes asociadas a cada categoría para evitar loremflickr
    defaultTemplateImages: {
      boda: "/api/thumb/lock/1",        // Bodas - clásica
      cumpleanos: "/api/thumb/lock/2",  // Cumpleaños - arcoíris
      babyshower: "/api/thumb/lock/3",  // Babyshower - nubes
      Bautizo: "/api/thumb/lock/4",     // Bautizo - ángel
      corporativo: "/api/thumb/lock/5", // Corporativo - tech
      // fallback general
      fallback: "/api/thumb/lock/1"
    },
    metaDescription: "Invify - 30 plantillas profesionales para bodas, cumpleaños, baby shower, bautizos y corporativo. Diseño editorial con RSVP, quiz y música.",
    metaDescription_en: "Invify - 30 professional templates for weddings, birthdays, baby showers, baptisms and corporate. Editorial design with RSVP, quiz and music.",
    // Métricas y conversión
    updatedAt: Date.now(),
  };
}

function baseBuilder({ primaryColor, background, fontFamily = "serif", backgroundImage, backgroundOverlay, textColor, modules, defaultImage }) {
  const theme = { primaryColor, background, fontFamily };
  if (backgroundImage) theme.backgroundImage = backgroundImage;
  else if (defaultImage) theme.backgroundImage = defaultImage;
  if (backgroundOverlay) theme.backgroundOverlay = backgroundOverlay;
  if (textColor) theme.textColor = textColor;
  return { theme, modules };
}

// Catálogo profesional: tipografía y paleta con intención.
// Los objetos declaran su propio `id`; el thumbnail/preview se inyecta abajo
// con ese id para que la URL siempre apunte a la plantilla correcta.
const RAW_TEMPLATES = [
  // ==================== BODA - 6 profesionales ====================
  {
    id: "boda-editorial-classic",
    name: "Boda Editorial Clásica",
    category: "boda",
    active: true,
    createdAt: Date.now(),
    builderConfig: baseBuilder({
      primaryColor: "#8B6A2B", background: "#FFFBF2", fontFamily: "serif", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "pre", type: "preloader", visible: true, text: "A & L", imageUrl: "/api/thumb/lock/101" },
        { id: "hdr", type: "header", visible: true, title: "Nos casamos", names: "Ana & Luis — 14.11.2026", date: "2026-11-14T16:00:00", subtitle: "Ceremonia íntima, celebración eterna", imageUrl: "/api/thumb/lock/2", style: { backgroundImage: "/api/thumb/lock/2", backgroundOverlay: "rgba(255,251,242,0.72)", textColor: "#2C2C2C", padding: "56px 20px", borderRadius: "20px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-11-14T16:00:00", label: "Cuenta regresiva editorial" },
        { id: "lc", type: "location", visible: true, venue: "Hacienda Los Olivos", address: "Km 12 Vía Chía, Colombia", lat: 4.85595, lng: -74.06095, mapUrl: "" },
        { id: "dc", type: "dresscode", visible: true, code: "Black Tie", description: "Etiqueta rigurosa. Evita blanco." },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "16:00", title: "Ceremonia" }, { time: "17:30", title: "Cóctel" }, { time: "19:00", title: "Banquete" }] },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/3" }, { url: "/api/thumb/lock/4" }] },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu asistencia", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "Nuestra historia", questions: [{ id: "q1", question: "¿Dónde se conocieron?", options: ["Universidad", "Viaje", "Trabajo"] }] },
      ],
    }),
  },
  {
    id: "boda-minimal-moderna",
    name: "Boda Minimal Moderna",
    category: "boda",
    active: true,
    createdAt: Date.now() + 1,
    builderConfig: baseBuilder({
      primaryColor: "#111111", background: "#F7F7F7", fontFamily: "sans", defaultImage: "/api/thumb/lock/1", textColor: "#111111",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "M & J", names: "María & Jorge", date: "2026-09-20T18:00:00", subtitle: "Menos es más", imageUrl: "/api/thumb/lock/6", style: { background: "#FFFFFF", textColor: "#111111", padding: "40px 20px", borderRadius: "0px", border: "1px solid #E5E5E5" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-20T18:00:00", label: "Save the date" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "18:00", title: "Civil" }, { time: "20:00", title: "Cena" }] },
        { id: "lc", type: "location", visible: true, venue: "Loft 22, CDMX", address: "Roma Norte, CDMX", lat: 19.419, lng: -99.164, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
      ],
    }),
  },
  {
    id: "boda-bohemia-romantica",
    name: "Boda Bohemia Atardecer",
    category: "boda",
    active: true,
    createdAt: Date.now() + 2,
    builderConfig: baseBuilder({
      primaryColor: "#C2704A", background: "#FFF5EF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Amor bohemio", names: "Sofía & Martín — Atardecer en Tulum", date: "2026-10-03T17:00:00", subtitle: "Pies descalzos, corazón lleno", imageUrl: "/api/thumb/lock/8", style: { backgroundImage: "/api/thumb/lock/8", backgroundOverlay: "rgba(255,245,239,0.68)", padding: "48px 20px", borderRadius: "24px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-10-03T17:00:00", label: "Atardecer" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/9" }, { url: "/api/thumb/lock/10" }] },
        { id: "dc", type: "dresscode", visible: true, code: "Boho Chic", description: "Lino, flores, natural." },
        { id: "lc", type: "location", visible: true, venue: "Playa del Cielo, Tulum", address: "Tulum, Quintana Roo", lat: 20.211, lng: -87.465, mapUrl: "" },
        { id: "au", type: "audio", visible: true, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", autoplay: false },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "¿Vienes a celebrar?", collectEmail: true },
      ],
    }),
  },
  {
    id: "boda-jardin-botanico",
    name: "Boda Jardín Botánico",
    category: "boda",
    active: true,
    createdAt: Date.now() + 3,
    builderConfig: baseBuilder({
      primaryColor: "#4A6B5A", background: "#F0F7F0", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Jardín de amor", names: "Valeria & Andrés", date: "2026-05-17T15:30:00", subtitle: "Entre flores y promesas", imageUrl: "/api/thumb/lock/12" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-05-17T15:30:00", label: "Florece" },
        { id: "lc", type: "location", visible: true, venue: "Jardín Botánico, Bogotá", address: "Calle 63, Bogotá", lat: 4.657, lng: -74.099, mapUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "15:30", title: "Ceremonia jardín" }, { time: "17:00", title: "Brindis" }, { time: "19:00", title: "Cena bajo luces" }] },
        { id: "gf", type: "giftTable", visible: true, items: [{ name: "Lluvia de sobres", url: "" }] },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/13" }, { url: "/api/thumb/lock/14" }] },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu asistencia", collectEmail: true },
      ],
    }),
  },
  {
    id: "boda-noche-lujo",
    name: "Boda Noche de Lujo",
    category: "boda",
    active: true,
    createdAt: Date.now() + 4,
    builderConfig: baseBuilder({
      primaryColor: "#D4AF37", background: "#0F0F1E", backgroundImage: "/api/thumb/lock/100", backgroundOverlay: "rgba(15,15,30,0.72)", textColor: "#FFFFFF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Bajo las estrellas", names: "Luna & Diego", date: "2026-08-08T20:00:00", subtitle: "Gala nocturna, luz eterna", imageUrl: "/api/thumb/lock/16", style: { background: "rgba(255,255,255,0.06)", textColor: "#FFFFFF", padding: "48px 20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.12)" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-08-08T20:00:00", label: "Noche estrellada" },
        { id: "dc", type: "dresscode", visible: true, code: "Gala", description: "Negro, dorado, brillo sutil.", style: { background: "#1A1A2E", textColor: "#D4AF37", padding: "24px", borderRadius: "12px" } },
        { id: "lc", type: "location", visible: true, venue: "Terraza Cielo, GDL", address: "Zapopan, Jalisco", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu presencia", collectEmail: true },
        { id: "au", type: "audio", visible: true, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", autoplay: false },
      ],
    }),
  },
  {
    id: "boda-destino-playa",
    name: "Boda Destino Playa",
    category: "boda",
    active: true,
    createdAt: Date.now() + 5,
    builderConfig: baseBuilder({
      primaryColor: "#0E8A7A", background: "#F0FFFA", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Destino: Amor", names: "Camila & Jorge — Playa del Carmen", date: "2026-06-21T17:30:00", subtitle: "Arena, mar y sí quiero", imageUrl: "/api/thumb/lock/18", style: { backgroundImage: "/api/thumb/lock/18", backgroundOverlay: "rgba(240,255,250,0.72)", padding: "52px 20px", borderRadius: "20px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-06-21T17:30:00", label: "Olas y cuenta" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "17:30", title: "Ceremonia playa" }, { time: "19:00", title: "Cena al atardecer" }, { time: "21:00", title: "Fiesta" }] },
        { id: "lc", type: "location", visible: true, venue: "Beach Club Maya", address: "Playa del Carmen, QRoo", lat: 20.629, lng: -87.073, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu viaje", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "¿Listo para viajar?", questions: [{ id: "q1", question: "¿Nadas con nosotros?", options: ["¡Sí!", "Solo ceremonia"] }] },
      ],
    }),
  },
  // ==================== CUMPLEAÑOS - 6 profesionales ====================
  {
    id: "cumple-infantil-arcoiris",
    name: "Cumple Arcoíris Infantil",
    category: "cumpleanos",
    active: true,
    createdAt: Date.now() + 10,
    builderConfig: baseBuilder({
      primaryColor: "#FF6B6B", background: "#FFF9E6", fontFamily: "sans", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "¡Fiesta Arcoíris!", names: "Mateo cumple 5", date: "2026-04-18T15:00:00", subtitle: "Colores, pastel y piñata", imageUrl: "/api/thumb/lock/2", style: { background: "linear-gradient(135deg,#FF6B6B,#FFD166)", textColor: "#FFFFFF", padding: "36px 20px", borderRadius: "20px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-04-18T15:00:00", label: "Ya casi" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/3" }, { url: "/api/thumb/lock/4" }] },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "15:00", title: "Piñata" }, { time: "16:00", title: "Pastel" }, { time: "17:00", title: "Show" }] },
        { id: "lc", type: "location", visible: true, venue: "Jardín La Casita, Puebla", address: "Puebla, Pue.", lat: 19.041, lng: -98.206, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "¿Vienes?", collectEmail: false },
      ],
    }),
  },
  {
    id: "cumple-neon-urbano",
    name: "Cumple Neon Urbano 25",
    category: "cumpleanos",
    active: true,
    createdAt: Date.now() + 11,
    builderConfig: baseBuilder({
      primaryColor: "#FF2E93", background: "#0A0A0A", backgroundOverlay: "rgba(0,0,0,0.6)", textColor: "#FFFFFF", fontFamily: "sans", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "NEON 25", names: "Sofi — Rooftop Party", date: "2026-07-12T21:00:00", subtitle: "Brilla, baila, celebra", imageUrl: "/api/thumb/lock/6", style: { background: "rgba(255,46,147,0.12)", textColor: "#FFFFFF", border: "1px solid rgba(255,46,147,0.35)", padding: "32px 20px", borderRadius: "16px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-07-12T21:00:00", label: "Neon countdown" },
        { id: "lc", type: "location", visible: true, venue: "Rooftop Neon, CDMX", address: "Condesa, CDMX", lat: 19.418, lng: -99.178, mapUrl: "" },
        { id: "qz", type: "quiz", visible: true, title: "Neon trivia", questions: [{ id: "q1", question: "¿Color de la noche?", options: ["Neon rosa", "Azul eléctrico"] }] },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "¿Vienes?", collectEmail: false },
        { id: "au", type: "audio", visible: true, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", autoplay: false },
      ],
    }),
  },
  {
    id: "cumple-elegante-40",
    name: "Cumple Elegante 40",
    category: "cumpleanos",
    active: true,
    createdAt: Date.now() + 12,
    builderConfig: baseBuilder({
      primaryColor: "#3A2D4A", background: "#F5F0FF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Noche elegante", names: "40 años de Claudia", date: "2026-09-05T20:00:00", subtitle: "Cóctel, jazz y gratitud", imageUrl: "/api/thumb/lock/8", style: { background: "#FFFFFF", textColor: "#3A2D4A", padding: "48px 20px", borderRadius: "16px", border: "1px solid #E9E0FF" } },
        { id: "dc", type: "dresscode", visible: true, code: "Cóctel elegante", description: "Negro, perlas, sofisticación." },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "20:00", title: "Bienvenida" }, { time: "21:00", title: "Brindis" }, { time: "22:30", title: "Baile" }] },
        { id: "lc", type: "location", visible: true, venue: "Casa Palmera, Mérida", address: "Mérida, Yucatán", lat: 20.97, lng: -89.62, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu lugar", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "¿Conoces a Claudia?", questions: [{ id: "q1", question: "¿Hobby?", options: ["Viajar", "Cocinar", "Leer"] }] },
      ],
    }),
  },
  {
    id: "cumple-tropical-30",
    name: "Cumple Tropical 30",
    category: "cumpleanos",
    active: true,
    createdAt: Date.now() + 13,
    builderConfig: baseBuilder({
      primaryColor: "#0E9F6E", background: "#ECFDF5", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "¡Aloha 30!", names: "Tropical Dani", date: "2026-06-28T16:00:00", subtitle: "Palmeras, alberca y atardecer", imageUrl: "/api/thumb/lock/10", style: { backgroundImage: "/api/thumb/lock/10", backgroundOverlay: "rgba(236,253,245,0.72)", padding: "44px 20px", borderRadius: "20px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-06-28T16:00:00", label: "Aloha" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/11" }, { url: "/api/thumb/lock/12" }] },
        { id: "lc", type: "location", visible: true, venue: "Quinta Tropical, Cuernavaca", address: "Cuernavaca, Morelos", lat: 18.924, lng: -99.221, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
      ],
    }),
  },
  {
    id: "cumple-vintage-50",
    name: "Cumple Vintage 50",
    category: "cumpleanos",
    active: true,
    createdAt: Date.now() + 14,
    builderConfig: baseBuilder({
      primaryColor: "#7C3A0A", background: "#FFF8DC", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Vinyl 50", names: "¡50 de Roberto!", date: "2026-08-15T19:30:00", subtitle: "Rock, vinilos y amigos", imageUrl: "/api/thumb/lock/14", style: { background: "#FFF8DC", textColor: "#7C3A0A", border: "2px dashed #E7C9A0", padding: "36px 20px", borderRadius: "12px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-08-15T19:30:00", label: "Retro" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "19:30", title: "Vinilos" }, { time: "21:00", title: "Banda en vivo" }] },
        { id: "lc", type: "location", visible: true, venue: "Salón Vinilo, GDL", address: "Guadalajara, Jal.", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
        { id: "au", type: "audio", visible: true, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", autoplay: false },
      ],
    }),
  },
  {
    id: "cumple-glam-30",
    name: "Cumple Glam 30",
    category: "cumpleanos",
    active: true,
    createdAt: Date.now() + 15,
    builderConfig: baseBuilder({
      primaryColor: "#A68A00", background: "#FFFDF0", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Glam Night", names: "Valentina — 30", date: "2026-11-22T21:00:00", subtitle: "Champagne, brillo y amigas", imageUrl: "/api/thumb/lock/16", style: { background: "linear-gradient(135deg,#FFFDF0,#FFF2B2)", textColor: "#5A4A00", padding: "48px 20px", borderRadius: "24px", border: "1px solid #F5E6A0" } },
        { id: "dc", type: "dresscode", visible: true, code: "Glam — Brillos", description: "Dorado, lentejuelas, tacones." },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-11-22T21:00:00", label: "Glam" },
        { id: "lc", type: "location", visible: true, venue: "Terraza Gold, Monterrey", address: "San Pedro, NL", lat: 25.658, lng: -100.367, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu glam", collectEmail: true },
      ],
    }),
  },
  // ==================== BABYSHOWER - 6 profesionales ====================
  {
    id: "babyshower-nubes-editorial",
    name: "Babyshower Nubes Editorial",
    category: "babyshower",
    active: true,
    createdAt: Date.now() + 20,
    builderConfig: baseBuilder({
      primaryColor: "#6B8CAE", background: "#F0FAFF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Entre nubes", names: "Esperando a Emma", date: "2026-06-14T16:00:00", subtitle: "Suavidad, luz y amor", imageUrl: "/api/thumb/lock/2", style: { background: "#FFFFFF", textColor: "#4A5A73", padding: "40px 20px", borderRadius: "20px", border: "1px solid #E0EAF5" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-06-14T16:00:00", label: "Llega Emma" },
        { id: "gf", type: "giftTable", visible: true, items: [{ name: "Lista Amazon Baby", url: "https://amazon.com/baby", imageUrl: "/api/thumb/lock/20" }] },
        { id: "lc", type: "location", visible: true, venue: "Casa Nube, Querétaro", address: "Querétaro, Qro.", lat: 20.588, lng: -100.389, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu asistencia", collectEmail: false },
        { id: "qz", type: "quiz", visible: true, title: "¿Niño o niña?", questions: [{ id: "q1", question: "¿Qué será?", options: ["Niña", "Niño", "Sorpresa"] }] },
      ],
    }),
  },
  {
    id: "babyshower-selva-moderna",
    name: "Babyshower Selva Moderna",
    category: "babyshower",
    active: true,
    createdAt: Date.now() + 21,
    builderConfig: baseBuilder({
      primaryColor: "#2F6B3A", background: "#F3FFF0", fontFamily: "sans", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Selva Baby", names: "León — Llega el rey", date: "2026-07-05T15:00:00", subtitle: "Hojas, aventura y ternura", imageUrl: "/api/thumb/lock/4", style: { backgroundImage: "/api/thumb/lock/4", backgroundOverlay: "rgba(243,255,240,0.78)", padding: "44px 20px", borderRadius: "16px" } },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "15:00", title: "Bienvenida selva" }, { time: "16:30", title: "Juegos" }] },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/5" }, { url: "/api/thumb/lock/6" }] },
        { id: "lc", type: "location", visible: true, venue: "Jardín Selva, Cuernavaca", address: "Cuernavaca, Mor.", lat: 18.928, lng: -99.221, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "¿Ruges con nosotros?", collectEmail: false },
      ],
    }),
  },
  {
    id: "babyshower-elefantito-clasico",
    name: "Babyshower Elefantito Clásico",
    category: "babyshower",
    active: true,
    createdAt: Date.now() + 22,
    builderConfig: baseBuilder({
      primaryColor: "#7A7A8A", background: "#F9FAFB", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Pequeño elefantito", names: "Noah — Dulce espera", date: "2026-05-30T16:30:00", subtitle: "Grandes sueños, corazón pequeño", imageUrl: "/api/thumb/lock/8", style: { background: "#FFFFFF", border: "2px solid #E5E7EB", padding: "36px 20px", borderRadius: "24px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-05-30T16:30:00", label: "Llega Noah" },
        { id: "gf", type: "giftTable", visible: true, items: [{ name: "Mesa Elefantito", url: "", imageUrl: "/api/thumb/lock/21" }] },
        { id: "lc", type: "location", visible: true, venue: "Salón Gris Perla, Puebla", address: "Puebla", lat: 19.041, lng: -98.206, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  {
    id: "babyshower-arcoiris-pastel",
    name: "Babyshower Arcoíris Pastel",
    category: "babyshower",
    active: true,
    createdAt: Date.now() + 23,
    builderConfig: baseBuilder({
      primaryColor: "#E46A9A", background: "#FFF0F5", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Arcoíris de amor", names: "¡Hola Mía!", date: "2026-08-12T17:00:00", subtitle: "Pastel, confeti y dulzura", imageUrl: "/api/thumb/lock/10", style: { background: "linear-gradient(135deg,#FFF0F5,#FFE4EC)", padding: "40px 20px", borderRadius: "20px" } },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/11" }, { url: "/api/thumb/lock/12" }] },
        { id: "qz", type: "quiz", visible: true, title: "Adivina el nombre", questions: [{ id: "q1", question: "¿Mía o Emma?", options: ["Mía", "Emma", "Sofía"] }] },
        { id: "lc", type: "location", visible: true, venue: "Terraza Arcoíris, GDL", address: "Guadalajara", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
      ],
    }),
  },
  {
    id: "babyshower-bosque-encantado",
    name: "Babyshower Bosque Encantado",
    category: "babyshower",
    active: true,
    createdAt: Date.now() + 24,
    builderConfig: baseBuilder({
      primaryColor: "#5A6B4A", background: "#F5F7F0", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Bosque mágico", names: "Luca — Hadas y duendes", date: "2026-09-14T15:00:00", subtitle: "Musgo, madera y magia", imageUrl: "/api/thumb/lock/14", style: { backgroundImage: "/api/thumb/lock/14", backgroundOverlay: "rgba(245,247,240,0.82)", padding: "48px 20px", borderRadius: "16px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-14T15:00:00", label: "Magia en camino" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "15:00", title: "Cuento en el bosque" }, { time: "16:30", title: "Merienda" }] },
        { id: "lc", type: "location", visible: true, venue: "Bosque Escondido, Valle", address: "Valle de Bravo", lat: 19.193, lng: -100.13, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: false },
      ],
    }),
  },
  {
    id: "babyshower-dulce-rosa",
    name: "Babyshower Dulce Rosa",
    category: "babyshower",
    active: true,
    createdAt: Date.now() + 25,
    builderConfig: baseBuilder({
      primaryColor: "#C97A8E", background: "#FFF5F8", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Dulce espera", names: "Isabella — Princesa", date: "2026-07-20T16:00:00", subtitle: "Moños, perlas y amor", imageUrl: "/api/thumb/lock/16", style: { background: "#FFFFFF", textColor: "#8A4A5E", border: "1px solid #F5D6E0", padding: "40px 20px", borderRadius: "20px" } },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/17" }] },
        { id: "lc", type: "location", visible: true, venue: "Casa Rosa, CDMX", address: "Coyoacán, CDMX", lat: 19.346, lng: -99.161, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
        { id: "au", type: "audio", visible: false, src: "" },
      ],
    }),
  },
  // ==================== BAUTIZO - 6 profesionales ====================
  {
    id: "bautizo-angel-blanco",
    name: "Bautizo Ángel Blanco",
    category: "bautizo",
    active: true,
    createdAt: Date.now() + 30,
    builderConfig: baseBuilder({
      primaryColor: "#6B7A90", background: "#F8FAFF", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Ángel de luz", names: "Gabriel — Bautizo", date: "2026-06-07T12:00:00", subtitle: "Blanco, puro, bendecido", imageUrl: "/api/thumb/lock/2", style: { background: "#FFFFFF", padding: "44px 20px", borderRadius: "16px", border: "1px solid #E0EAF5" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-06-07T12:00:00", label: "Bendición" },
        { id: "lc", type: "location", visible: true, venue: "Parroquia San Ángel, CDMX", address: "San Ángel, CDMX", lat: 19.345, lng: -99.188, mapUrl: "" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "12:00", title: "Misa" }, { time: "14:00", title: "Comida familiar" }] },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: false },
      ],
    }),
  },
  {
    id: "bautizo-clasico-catedral",
    name: "Bautizo Catedral Clásico",
    category: "bautizo",
    active: true,
    createdAt: Date.now() + 31,
    builderConfig: baseBuilder({
      primaryColor: "#8B7A5A", background: "#FFFEFB", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Mi Bautizo", names: "Sofía Victoria", date: "2026-07-11T11:00:00", subtitle: "Fe, familia y tradición", imageUrl: "/api/thumb/lock/4" },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-07-11T11:00:00", label: "Día sagrado" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/5" }] },
        { id: "lc", type: "location", visible: true, venue: "Catedral de Puebla", address: "Centro, Puebla", lat: 19.042, lng: -98.198, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  {
    id: "bautizo-acuarela-moderna",
    name: "Bautizo Acuarela Moderna",
    category: "bautizo",
    active: true,
    createdAt: Date.now() + 32,
    builderConfig: baseBuilder({
      primaryColor: "#7BA3C4", background: "#FFF9F0", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Acuarela de fe", names: "Luna — Colores de bendición", date: "2026-08-09T12:30:00", subtitle: "Pinceladas de amor", imageUrl: "/api/thumb/lock/7", style: { background: "linear-gradient(135deg,#FFF9F0,#EAF4FF)", padding: "40px 20px", borderRadius: "20px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-08-09T12:30:00", label: "Cuenta regresiva" },
        { id: "lc", type: "location", visible: true, venue: "Capilla Acuarela, Querétaro", address: "Querétaro", lat: 20.588, lng: -100.389, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
        { id: "qz", type: "quiz", visible: true, title: "¿Sabías?", questions: [{ id: "q1", question: "¿Padrinos?", options: ["Tíos", "Abuelos"] }] },
      ],
    }),
  },
  {
    id: "bautizo-principe-azul",
    name: "Bautizo Pequeño Príncipe",
    category: "bautizo",
    active: true,
    createdAt: Date.now() + 33,
    builderConfig: baseBuilder({
      primaryColor: "#4A5A8A", background: "#F8F5FF", fontFamily: "serif", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Mi Principito", names: "Leo — Corona y amor", date: "2026-05-16T12:00:00", subtitle: "Pequeño rey, gran bendición", imageUrl: "/api/thumb/lock/9", style: { backgroundImage: "/api/thumb/lock/9", backgroundOverlay: "rgba(248,245,255,0.78)", padding: "44px 20px", borderRadius: "16px" } },
        { id: "dc", type: "dresscode", visible: true, code: "Celeste y blanco", description: "Formal bautismal." },
        { id: "lc", type: "location", visible: true, venue: "Parroquia del Príncipe, GDL", address: "Guadalajara", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  {
    id: "bautizo-luz-dorada",
    name: "Bautizo Luz Dorada",
    category: "bautizo",
    active: true,
    createdAt: Date.now() + 34,
    builderConfig: baseBuilder({
      primaryColor: "#B9972B", background: "#FFFEF0", fontFamily: "serif", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Luz divina", names: "Alana — Que tu luz brille", date: "2026-09-20T11:30:00", subtitle: "Dorado, luz y fe", imageUrl: "/api/thumb/lock/11", style: { background: "#FFFEF0", textColor: "#6B5A1A", border: "1px solid #F5E6A0", padding: "40px 20px", borderRadius: "16px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-20T11:30:00", label: "Luz en camino" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "11:30", title: "Ceremonia" }, { time: "13:00", title: "Brindis" }] },
        { id: "lc", type: "location", visible: true, venue: "Iglesia Luz, Monterrey", address: "Monterrey, NL", lat: 25.675, lng: -100.316, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: false },
      ],
    }),
  },
  {
    id: "bautizo-floral-jardin",
    name: "Bautizo Floral Jardín",
    category: "bautizo",
    active: true,
    createdAt: Date.now() + 35,
    builderConfig: baseBuilder({
      primaryColor: "#9A6B7A", background: "#FFF6FA", fontFamily: "serif",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Flores de bendición", names: "Mila — Florece con fe", date: "2026-10-11T12:00:00", subtitle: "Pétalos y oración", imageUrl: "/api/thumb/lock/13", style: { backgroundImage: "/api/thumb/lock/13", backgroundOverlay: "rgba(255,246,250,0.75)", padding: "48px 20px", borderRadius: "20px" } },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/14" }, { url: "/api/thumb/lock/15" }] },
        { id: "lc", type: "location", visible: true, venue: "Jardín Floral, Xochimilco", address: "CDMX", lat: 19.275, lng: -99.094, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
      ],
    }),
  },
  // ==================== CORPORATIVO - 6 profesionales ====================
  {
    id: "corp-tech-summit",
    name: "Tech Summit 2026",
    category: "corporativo",
    active: true,
    createdAt: Date.now() + 40,
    builderConfig: baseBuilder({
      primaryColor: "#2563EB", background: "#F0F6FF", fontFamily: "sans", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Tech Summit 2026", names: "Innovación sin límites", date: "2026-10-22T09:00:00", subtitle: "Keynotes, demos, networking", imageUrl: "/api/thumb/lock/2", style: { background: "#FFFFFF", border: "1px solid #DBEAFE", padding: "32px 20px", borderRadius: "12px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-10-22T09:00:00", label: "Falta para el summit" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "09:00", title: "Registro" }, { time: "10:00", title: "Keynote" }, { time: "13:00", title: "Networking lunch" }] },
        { id: "lc", type: "location", visible: true, venue: "Centro Citibanamex, CDMX", address: "CDMX", lat: 19.428, lng: -99.203, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "¿Qué track te interesa?", questions: [{ id: "q1", question: "Área", options: ["AI", "Cloud", "Blockchain"] }] },
      ],
    }),
  },
  {
    id: "corp-gala-anual",
    name: "Gala Anual Negocios",
    category: "corporativo",
    active: true,
    createdAt: Date.now() + 41,
    builderConfig: baseBuilder({
      primaryColor: "#0F172A", background: "#F8FAFC", fontFamily: "serif", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Gala Anual", names: "Premios Empresariales 2026", date: "2026-11-28T20:00:00", subtitle: "Celebrando la excelencia", imageUrl: "/api/thumb/lock/4", style: { background: "#0F172A", textColor: "#F8FAFC", padding: "48px 20px", borderRadius: "12px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-11-28T20:00:00", label: "Gala" },
        { id: "dc", type: "dresscode", visible: true, code: "Gala — Traje oscuro", description: "Etiqueta." },
        { id: "lc", type: "location", visible: true, venue: "Hotel Four Seasons, CDMX", address: "Polanco, CDMX", lat: 19.425, lng: -99.194, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma tu lugar", collectEmail: true },
      ],
    }),
  },
  {
    id: "corp-lanzamiento-producto",
    name: "Lanzamiento Producto X",
    category: "corporativo",
    active: true,
    createdAt: Date.now() + 42,
    builderConfig: baseBuilder({
      primaryColor: "#7C3AED", background: "#FAF5FF", fontFamily: "sans", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Producto X — Reveal", names: "El futuro es ahora", date: "2026-09-10T18:30:00", subtitle: "Demo en vivo, cóctel y prensa", imageUrl: "/api/thumb/lock/6", style: { background: "linear-gradient(135deg,#FAF5FF,#F5F3FF)", padding: "40px 20px", borderRadius: "20px", border: "1px solid #E9D5FF" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-09-10T18:30:00", label: "Reveal" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/7" }] },
        { id: "lc", type: "location", visible: true, venue: "Showroom Central, GDL", address: "Guadalajara", lat: 20.659, lng: -103.349, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Reserva tu lugar", collectEmail: true },
      ],
    }),
  },
  {
    id: "corp-networking-cocktail",
    name: "Networking Cocktail",
    category: "corporativo",
    active: true,
    createdAt: Date.now() + 43,
    builderConfig: baseBuilder({
      primaryColor: "#047857", background: "#ECFDF5", fontFamily: "sans", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Networking Cocktail", names: "Conecta & Crece", date: "2026-08-20T18:00:00", subtitle: "Cóctel ejecutivo, pitch 1-min", imageUrl: "/api/thumb/lock/9" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "18:00", title: "Bienvenida" }, { time: "19:00", title: "Pitch 1-min" }, { time: "20:30", title: "Cóctel libre" }] },
        { id: "lc", type: "location", visible: true, venue: "Terraza Reforma, CDMX", address: "Reforma 222, CDMX", lat: 19.426, lng: -99.167, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "¿Qué buscas?", questions: [{ id: "q1", question: "¿Buscas?", options: ["Inversión", "Clientes", "Talento"] }] },
      ],
    }),
  },
  {
    id: "corp-anual-formal",
    name: "Reunión Anual Formal",
    category: "corporativo",
    active: true,
    createdAt: Date.now() + 44,
    builderConfig: baseBuilder({
      primaryColor: "#334155", background: "#F1F5F9", fontFamily: "serif", defaultImage: "/api/thumb/lock/1",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Reunión Anual", names: "Grupo Invify 2026", date: "2026-12-12T10:00:00", subtitle: "Resultados y visión 2027", imageUrl: "/api/thumb/lock/11", style: { background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "32px 20px", borderRadius: "8px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-12-12T10:00:00", label: "Reunión anual" },
        { id: "it", type: "itinerary", visible: true, items: [{ time: "10:00", title: "Apertura" }, { time: "11:30", title: "Resultados" }, { time: "13:00", title: "Brindis" }] },
        { id: "lc", type: "location", visible: true, venue: "Auditorio Corporativo, Monterrey", address: "Monterrey, NL", lat: 25.675, lng: -100.316, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Confirma asistencia", collectEmail: true },
      ],
    }),
  },
  {
    id: "corp-startup-pitch",
    name: "Startup Pitch Night",
    category: "corporativo",
    active: true,
    createdAt: Date.now() + 45,
    builderConfig: baseBuilder({
      primaryColor: "#EA580C", background: "#FFF7ED", fontFamily: "sans",
      modules: [
        { id: "hdr", type: "header", visible: true, title: "Startup Pitch Night", names: "Demo Day Invify", date: "2026-07-30T18:00:00", subtitle: "Ideas que cambian el mundo", imageUrl: "/api/thumb/lock/13", style: { background: "linear-gradient(135deg,#FFF7ED,#FFEDD5)", padding: "36px 20px", borderRadius: "16px" } },
        { id: "cd", type: "countdown", visible: true, targetDate: "2026-07-30T18:00:00", label: "Demo Day" },
        { id: "ca", type: "carousel", visible: true, images: [{ url: "/api/thumb/lock/14" }] },
        { id: "lc", type: "location", visible: true, venue: "Campus Creativo, CDMX", address: "Santa Fe, CDMX", lat: 19.357, lng: -99.278, mapUrl: "" },
        { id: "tx", type: "text", visible: true, title: "Mensaje especial", content: "<p>Escribe tu mensaje especial aquí. Este bloque queda exactamente donde lo dejes — arrástralo en el editor para reordenar.</p>", align: "center" },
        { id: "rs", type: "rsvp", visible: true, title: "Reserva tu pitch", collectEmail: true },
        { id: "qz", type: "quiz", visible: true, title: "¿Qué startup eres?", questions: [{ id: "q1", question: "¿Etapa?", options: ["Idea", "MVP", "Escalando"] }] },
      ],
    }),
  },
];

// Cada plantilla usa su propio id para las imágenes de catálogo y preview.
// Antes estos campos usaban `"/api/thumb/"+id` o `${t.id}`, que no estaban
// definidos en ningún scope y hacían fallar el seed con "id is not defined".
export const TEMPLATES = RAW_TEMPLATES.map((t) => ({
  ...t,
  thumbnailUrl: `/api/thumb/${t.id}`,
  previewUrl: `/api/thumb/${t.id}?size=lg`,
}));

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
