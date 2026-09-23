// ============================================================================
// IA - Generación de plantillas
// 1) buildAIPrompt(): arma el prompt principal que se envía a la IA con el
//    idioma activo y las respuestas del wizard.
// 2) buildMockTemplate(): genera un builderConfig determinista (mockup) a
//    partir de las respuestas, para que el flujo funcione sin depender de una
//    API externa. Si se conecta una IA real, su JSON reemplaza este mock.
// ============================================================================
import type { BuilderConfig, TemplateCategory } from "../types";
import {
  ATMOSPHERE_OPTIONS,
  CATEGORY_OPTIONS,
  IMAGE_STYLE_OPTIONS,
  type WizardAnswers,
} from "./options";

export type Lang = "es" | "en";

interface ItineraryItem {
  time: string;
  title: string;
}

// Textos que se insertan DENTRO de la plantilla generada, en el idioma activo.
interface Localized {
  defaultNames: string;
  headers: Record<string, string>;
  subtitles: Record<string, string>;
  countdown: string;
  welcomeTitle: string;
  welcomeContent: string;
  rsvp: string;
  venue: string;
  address: string;
  dresscode: string;
  dresscodeDesc: string;
  gifts: { name: string; description: string }[];
  itineraryByCat: Record<string, ItineraryItem[]>;
}

const ES: Localized = {
  defaultNames: "Ana & Luis",
  headers: {
    boda: "¡Nos casamos!",
    cumpleanos: "¡Feliz cumpleaños!",
    xv: "Mis XV años",
    babyshower: "¡Estamos esperando un bebé!",
    bautizo: "¡Celebremos el bautizo!",
    corporativo: "¡Te esperamos!",
  },
  subtitles: {
    boda: "Nos encantaría compartir este momento contigo",
    cumpleanos: "Acompáñanos a celebrar",
    xv: "Una noche mágica para celebrar mis XV años",
    babyshower: "Celebremos la llegada de nuestra bebé",
    bautizo: "Gracias por ser parte de este momento especial",
    corporativo: "Un momento para convivir y celebrar juntos",
  },
  countdown: "Cuenta regresiva",
  welcomeTitle: "Mensaje especial",
  welcomeContent:
    "<p>Queridos invitados: será un honor contar con su presencia en este día tan especial. Aquí encontrarán todos los detalles de nuestro evento.</p>",
  rsvp: "Confirma tu asistencia",
  venue: "Lugar por confirmar",
  address: "Dirección por confirmar",
  dresscode: "Smart Casual",
  dresscodeDesc: "Cómodo y elegante",
  gifts: [
    { name: "Aporta con amor", description: "Con tu apoyo, nuestro evento llega más lejos." },
    { name: "Una tarjeta con palabras", description: "Un mensaje escrito vale más que cualquier regalo." },
  ],
  itineraryByCat: {
    boda: [
      { time: "16:00", title: "Ceremonia" },
      { time: "18:00", title: "Cóctel" },
      { time: "20:00", title: "Banquete" },
    ],
    cumpleanos: [
      { time: "17:00", title: "Recepción" },
      { time: "19:00", title: "Juegos y dinámicas" },
      { time: "21:00", title: "Pastel y regalos" },
    ],
    babyshower: [
      { time: "16:00", title: "Bienvenida" },
      { time: "18:00", title: "Dinámicas" },
      { time: "19:00", title: "Pastel" },
    ],
    bautizo: [
      { time: "12:00", title: "Ceremonia" },
      { time: "14:00", title: "Recepción" },
      { time: "15:00", title: "Brindis" },
    ],
    corporativo: [
      { time: "09:00", title: "Registro" },
      { time: "10:00", title: "Presentación" },
      { time: "12:00", title: "Networking" },
    ],
  },
};

const EN: Localized = {
  defaultNames: "Ana & Luis",
  headers: {
    boda: "We're getting married!",
    cumpleanos: "Happy birthday!",
    xv: "My Quinceañera",
    babyshower: "We're expecting a baby!",
    bautizo: "Let's celebrate the baptism!",
    corporativo: "We're looking forward to seeing you",
  },
  subtitles: {
    boda: "We would love to share this moment with you",
    cumpleanos: "Join us to celebrate",
    xv: "A magical night to celebrate my quinceañera",
    babyshower: "Let's celebrate the arrival of our baby",
    bautizo: "Thank you for being part of this special moment",
    corporativo: "A moment to connect and celebrate together",
  },
  countdown: "Countdown",
  welcomeTitle: "Special message",
  welcomeContent:
    "<p>Dear guests: it will be an honor to have you on this very special day. Here you'll find all the details of our event.</p>",
  rsvp: "Confirm your attendance",
  venue: "Venue TBA",
  address: "Address TBA",
  dresscode: "Smart Casual",
  dresscodeDesc: "Comfortable and elegant",
  gifts: [
    { name: "Give with love", description: "With your support, our event goes further." },
    { name: "A card with words", description: "A written message is worth more than any present." },
  ],
  itineraryByCat: {
    boda: [
      { time: "04:00 PM", title: "Ceremony" },
      { time: "06:00 PM", title: "Cocktail" },
      { time: "08:00 PM", title: "Dinner" },
    ],
    cumpleanos: [
      { time: "05:00 PM", title: "Reception" },
      { time: "07:00 PM", title: "Games" },
      { time: "09:00 PM", title: "Cake & presents" },
    ],
    babyshower: [
      { time: "04:00 PM", title: "Welcome" },
      { time: "06:00 PM", title: "Activities" },
      { time: "07:00 PM", title: "Cake" },
    ],
    bautizo: [
      { time: "12:00 PM", title: "Ceremony" },
      { time: "02:00 PM", title: "Reception" },
      { time: "03:00 PM", title: "Toast" },
    ],
    corporativo: [
      { time: "09:00 AM", title: "Registration" },
      { time: "10:00 AM", title: "Presentation" },
      { time: "12:00 PM", title: "Networking" },
    ],
  },
};

const COPY: Record<Lang, Localized> = { es: ES, en: EN };

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

function pick<T>(list: T[], id: string, fallback: T): T {
  return list.find((o) => (o as { id?: string }).id === id) ?? fallback;
}

function imageUrl(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function defaultTargetDate(lang: Lang): string {
  const d = new Date(Date.now() + 90 * 86400000);
  return d.toISOString();
}

export interface GenerateInput {
  language: Lang;
  answers: WizardAnswers;
}

// ---------------------------------------------------------------------------
// 1) Prompt principal para la IA
// ---------------------------------------------------------------------------
export function buildAIPrompt({ language, answers }: GenerateInput): string {
  const catOption = pick(CATEGORY_OPTIONS, answers.category, CATEGORY_OPTIONS[0]);
  const atm = pick(ATMOSPHERE_OPTIONS, answers.atmosphere, ATMOSPHERE_OPTIONS[0]);
  const img = pick(IMAGE_STYLE_OPTIONS, answers.imageStyle, IMAGE_STYLE_OPTIONS[0]);
  const c = COPY[language];

  const categoryLabel =
    language === "en"
      ? ({ boda: "Wedding", cumpleanos: "Birthday", xv: "Quinceañera", babyshower: "Baby Shower", bautizo: "Baptism", corporativo: "Corporate" } as Record<string, string>)[catOption.id]
      : ({
          boda: "Boda",
          cumpleanos: "Cumpleaños",
          xv: "XV años",
          babyshower: "Baby Shower",
          bautizo: "Bautizo",
          corporativo: "Corporativo",
        } as Record<string, string>)[catOption.id];

  const imageStyleLabel =
    language === "en"
      ? ({ flowers: "Flowers", party: "Party lights", abstract: "Abstract" } as Record<string, string>)[img.id]
      : ({ flowers: "Flores", party: "Luces de fiesta", abstract: "Abstracto" } as Record<string, string>)[img.id];

  const concept = [
    `Celebramos: ${categoryLabel}`,
    `Nombres: ${answers.names || c.defaultNames}`,
    `Fecha: ${answers.date || "por confirmar / TBA"}`,
    `Atmósfera: ${atm.nameKey} (${atm.palette.background} / ${atm.palette.primary})`,
    `Funciones incluidas: ${answers.features.join(", ") || "ninguna / none"}`,
    `Estilo de imágenes: ${imageStyleLabel}`,
  ].join(". ");

  return `Eres diseñador web de invitaciones. Genera una plantilla en JSON válido en idioma ${language}.
Requisitos: Template: { id (slug), name, category, thumbnailUrl, previewUrl, active: true, createdAt, builderConfig: { theme: { primaryColor, background, fontFamily }, modules: [ array ordenado con id, type, visible ] } }.
Tipos: preloader, header (SIEMPRE), countdown, audio, carousel, location, dresscode, itinerary, giftTable, quiz, rsvp, text.
Concepto del usuario: ${concept}. Categoría: ${categoryLabel}. Imágenes estilo: ${imageStyleLabel}.
Devuelve ÚNICAMENTE el JSON.`;
}

// ---------------------------------------------------------------------------
// 2) Plantilla mock determinista (fallback / demo)
// ---------------------------------------------------------------------------
export function buildMockTemplate({ language, answers }: GenerateInput): {
  id: string;
  name: string;
  category: TemplateCategory;
  thumbnailUrl: string;
  previewUrl: string;
  builderConfig: BuilderConfig;
} {
  const catOption = pick(CATEGORY_OPTIONS, answers.category, CATEGORY_OPTIONS[0]);
  const category: TemplateCategory = catOption.category;
  const atm = pick(ATMOSPHERE_OPTIONS, answers.atmosphere, ATMOSPHERE_OPTIONS[0]);
  const img = pick(IMAGE_STYLE_OPTIONS, answers.imageStyle, IMAGE_STYLE_OPTIONS[0]);
  const c = COPY[language];

  const names = (answers.names || "").trim() || c.defaultNames;
  const name = `Demo ${names}`;
  const id = `demo-${slugify(names || catOption.id)}-${Date.now().toString(36)}`;
  const seed = `invify-${catOption.id}-${img.id}`;
  const headerImage = imageUrl(seed, 1200, 800);
  const title = c.headers[catOption.id as keyof typeof c.headers] ?? c.headers.boda;
  const subtitle = c.subtitles[catOption.id as keyof typeof c.subtitles] ?? c.subtitles.boda;

  const targetDate = answers.date
    ? `${answers.date}T17:00:00`
    : defaultTargetDate(language);

  const features = answers.features ?? [];

  const modules: any[] = [];

  modules.push({
    id: "pre",
    type: "preloader",
    visible: true,
    text: names,
    imageUrl: imageUrl(seed, 400, 400),
  });

  modules.push({
    id: "hdr",
    type: "header",
    visible: true,
    title,
    names,
    date: targetDate,
    subtitle,
    imageUrl: headerImage,
    style: {
      backgroundImage: headerImage,
      backgroundOverlay: `rgba(${atm.palette.background === "#101014" ? "16,16,20" : "255,255,255"},0.72)`,
      textColor: atm.palette.textColor,
      padding: "48px 20px",
      borderRadius: "20px",
    },
  });

  modules.push({
    id: "cd",
    type: "countdown",
    visible: true,
    targetDate,
    label: c.countdown,
  });

  if (features.includes("location")) {
    modules.push({
      id: "lc",
      type: "location",
      visible: true,
      venue: c.venue,
      address: c.address,
      lat: 19.4326,
      lng: -99.1332,
      mapUrl: "",
    });
  }

  if (features.includes("giftTable")) {
    modules.push({
      id: "gt",
      type: "giftTable",
      visible: true,
      items: c.gifts,
    });
  }

  if (features.includes("dresscode")) {
    modules.push({
      id: "dc",
      type: "dresscode",
      visible: true,
      code: c.dresscode,
      description: c.dresscodeDesc,
    });
  }

  if (features.includes("itinerary")) {
    const itinerary =
      c.itineraryByCat[catOption.id as keyof typeof c.itineraryByCat] ??
      c.itineraryByCat.cumpleanos;
    modules.push({
      id: "it",
      type: "itinerary",
      visible: true,
      items: itinerary,
    });
  }

  modules.push({
    id: "ca",
    type: "carousel",
    visible: true,
    images: [
      { url: imageUrl(seed + "-1", 800, 600) },
      { url: imageUrl(seed + "-2", 800, 600) },
      { url: imageUrl(seed + "-3", 800, 600) },
    ],
  });

  modules.push({
    id: "tx",
    type: "text",
    visible: true,
    title: c.welcomeTitle,
    content: c.welcomeContent,
    align: "center",
  });

  if (features.includes("rsvp")) {
    modules.push({
      id: "rs",
      type: "rsvp",
      visible: true,
      title: c.rsvp,
      collectEmail: true,
    });
  }

  return {
    id,
    name,
    category,
    thumbnailUrl: imageUrl(seed, 800, 600),
    previewUrl: imageUrl(seed, 1200, 800),
    builderConfig: {
      theme: {
        primaryColor: atm.palette.primary,
        background: atm.palette.background,
        textColor: atm.palette.textColor,
        fontFamily: atm.palette.fontFamily,
      },
      modules,
    },
  };
}