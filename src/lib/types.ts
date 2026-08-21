// ============================================================================
// MODELOS DE DATOS - Invify
// Tipos TypeScript que reflejan el esquema de Firestore y el JSON del editor.
// ============================================================================

// ----------------------------- Auth / Usuarios -----------------------------
export type UserRole = "cliente" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: number; // epoch ms
}

// ----------------------------- Catálogo -------------------------------------
export type TemplateCategory = "boda" | "cumpleanos" | "babyshower" | "bautizo" | "corporativo";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  thumbnailUrl: string;
  previewUrl: string;
  // JSON del diseño: secciones/widgets (ver BuilderConfig).
  builderConfig: BuilderConfig;
  active: boolean;
  createdAt: number;
}

// ----------------------------- Invitaciones --------------------------------
export type InvitationStatus = "draft" | "published";

export interface InvitationStats {
  views: number;
  uniqueViews: number;
}

export interface Invitation {
  id: string;
  ownerUid: string;
  templateId: string;
  title: string;
  slug: string; // único, /i/<slug>
  themeColor: string; // hex, ej. #D4AF37
  status: InvitationStatus;
  createdAt: number;
  orderId: string | null;
  // Config personalizada del cliente (copia editable del template).
  builderConfig: BuilderConfig;
  stats: InvitationStats;
  // Metadatos SEO opcionales por invitación.
  meta?: {
    description?: string;
    imageUrl?: string;
  };
}

// ----------------------------- Formularios públicos ------------------------
export interface Rsvp {
  nombre: string;
  email: string;
  personas: number; // pax
  fecha: string; // ISO
  createdAt: number;
}

export interface QuizResponse {
  fecha: string;
  datos: Record<string, string>; // map pregunta -> respuesta
  createdAt: number;
}

// ----------------------------- Planes / Pagos ------------------------------
export interface Plan {
  id: string;
  name: string;
  price: number; // en centavos
  currency: string;
  features: string[];
  stripePriceId: string;
}

export interface Order {
  id: string;
  uid: string;
  planId: string;
  invitationId: string | null;
  status: "pending" | "paid" | "failed" | "canceled";
  stripeSessionId: string;
  createdAt: number;
}

// ============================================================================
// BUILDER CONFIG - Estructura JSON de una invitación
// Es un array ordenado de módulos/widgets. Cada módulo es una unión
// discriminada por la propiedad "type".
// ============================================================================

export type ModuleType =
  | "preloader"
  | "header"
  | "countdown"
  | "audio"
  | "carousel"
  | "location"
  | "dresscode"
  | "itinerary"
  | "giftTable"
  | "quiz"
  | "rsvp";

interface BaseModule {
  id: string; // id estable del módulo
  type: ModuleType;
  visible: boolean;
}

export interface PreloaderModule extends BaseModule {
  type: "preloader";
  imageUrl?: string;
  text?: string;
}

export interface HeaderModule extends BaseModule {
  type: "header";
  title: string;
  subtitle?: string;
  names?: string;
  date?: string;
  imageUrl?: string;
}

export interface CountdownModule extends BaseModule {
  type: "countdown";
  targetDate: string; // ISO
  label?: string;
}

export interface AudioModule extends BaseModule {
  type: "audio";
  src: string; // url de audio
  autoplay?: boolean;
}

export interface CarouselImage {
  url: string;
  caption?: string;
}
export interface CarouselModule extends BaseModule {
  type: "carousel";
  images: CarouselImage[];
}

export interface LocationModule extends BaseModule {
  type: "location";
  venue: string;
  address: string;
  lat: number;
  lng: number;
  mapUrl?: string;
}

export interface DresscodeModule extends BaseModule {
  type: "dresscode";
  code: string;
  description?: string;
  imageUrl?: string;
}

export interface ItineraryItem {
  time: string;
  title: string;
  description?: string;
}
export interface ItineraryModule extends BaseModule {
  type: "itinerary";
  items: ItineraryItem[];
}

export interface GiftItem {
  name: string;
  description?: string;
  url?: string;
  imageUrl?: string;
}
export interface GiftTableModule extends BaseModule {
  type: "giftTable";
  items: GiftItem[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}
export interface QuizModule extends BaseModule {
  type: "quiz";
  title: string;
  questions: QuizQuestion[];
}

export interface RsvpModule extends BaseModule {
  type: "rsvp";
  title: string;
  collectEmail: boolean;
}

export type InvitationModule =
  | PreloaderModule
  | HeaderModule
  | CountdownModule
  | AudioModule
  | CarouselModule
  | LocationModule
  | DresscodeModule
  | ItineraryModule
  | GiftTableModule
  | QuizModule
  | RsvpModule;

export interface BuilderConfig {
  // Orden de render. Los módulos con visible=false se omiten.
  modules: InvitationModule[];
  // Estilos globales de la invitación.
  theme: {
    primaryColor: string;
    background: string;
    fontFamily: "serif" | "sans";
  };
}

// ----------------------------- Utilidades SEO -------------------------------
export interface SeoMeta {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}

// ----------------------------- Config del sitio (admin) ----------------------
// Documento /site/config editable desde el panel admin; alimenta el hero y el
// SEO de la landing principal.
export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  heroImage?: string;
  metaDescription: string;
}
