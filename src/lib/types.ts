// ============================================================================
// MODELOS DE DATOS - Invify
// Tipos TypeScript que reflejan el esquema de Firestore y el JSON del editor.
// ============================================================================

// ----------------------------- Auth / Usuarios -----------------------------
export type UserRole = "cliente" | "admin";

export interface UserBilling {
  rfc?: string;
  razonSocial?: string;
  emailFiscal?: string;
  direccion?: string;
  cp?: string;
  telefono?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: number; // epoch ms
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  billing?: UserBilling;
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
export type InvitationTier = "free" | "premium";

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
  planId?: string; // plan comprado
  tier: InvitationTier; // NUEVO: 'free' | 'premium'
  tierUpdatedAt?: number; // timestamp del último cambio de tier
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
  stripePriceId: string; // legacy
  interval?: "one_time" | "day" | "week" | "month" | "year";
  stripePriceIdTest?: string;
  stripePriceIdLive?: string;
  stripeProductId?: string; // legacy
  stripeProductIdTest?: string;
  stripeProductIdLive?: string;
}

export interface Order {
  id: string;
  uid: string;
  planId: string;
  templateId?: string;
  invitationId: string | null;
  status: "pending" | "paid" | "failed" | "canceled";
  provider?: "stripe" | "paypal" | "mercadopago";
  mode?: "test" | "live";
  providerRef?: string; // payment_intent/session/orden paypal/payment mp
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  amount?: number; // en centavos
  currency?: string; // ej. "mxn", "usd"
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
// SEO de la landing principal, y claves de pagos.
export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  heroImage?: string;
  metaDescription: string;

  // Stripe - Test
  stripeTestPublishableKey?: string;
  stripeTestSecretKey?: string;
  stripeTestWebhookSecret?: string;

  // Stripe - Live
  stripeLivePublishableKey?: string;
  stripeLiveSecretKey?: string;
  stripeLiveWebhookSecret?: string;

  // PayPal - Test
  paypalTestClientId?: string;
  paypalTestSecret?: string;
  paypalTestWebhookId?: string;

  // PayPal - Live
  paypalLiveClientId?: string;
  paypalLiveSecret?: string;
  paypalLiveWebhookId?: string;

  // Mercado Pago - Test
  mercadopagoTestAccessToken?: string;
  mercadopagoTestPublicKey?: string;
  mercadopagoTestWebhookSecret?: string;

  // Mercado Pago - Live
  mercadopagoLiveAccessToken?: string;
  mercadopagoLivePublicKey?: string;
  mercadopagoLiveWebhookSecret?: string;

  // Modo activo global (para UI)
  stripeTestMode?: boolean; // true = test, false = live
}

// ----------------------------- Páginas CMS -----------------------------------
// Cada página es un documento en /pages/{pageId}
export interface Page {
  id: string;
  slug: string;           // URL path, ej: "/", "/nosotros", "/servicios"
  title: string;          // Título interno
  seoTitle?: string;      // Título SEO (opcional, usa title si no)
  metaDescription?: string;
  metaImage?: string;     // Open Graph image
  builderConfig: BuilderConfig;  // Contenido visual (módulos)
  status: "draft" | "published";
  isHome: boolean;        // Solo una puede ser true (la home "/")
  createdAt: number;
  updatedAt: number;
}

// ----------------------------- Logs / Auditoría -------------------------------
export type LogAction =
  | "user.login"
  | "user.logout"
  | "user.register"
  | "user.profile_update"
  | "user.password_change"
  | "order.created"
  | "order.paid"
  | "order.failed"
  | "order.cancelled"
  | "order.refunded"
  | "invitation.created"
  | "invitation.updated"
  | "invitation.published"
  | "invitation.unpublished"
  | "invitation.deleted"
  | "invitation.cloned_from_template"
  | "template.created"
  | "template.updated"
  | "template.deleted"
  | "template.activated"
  | "template.deactivated"
  | "page.created"
  | "page.updated"
  | "page.published"
  | "page.unpublished"
  | "page.deleted"
  | "page.set_as_home"
  | "settings.updated"
  | "settings.payment_keys_updated"
  | "webhook.received"
  | "webhook.processed"
  | "webhook.failed"
  | "payment.processed"
  | "payment.refunded"
  | "admin.user_created"
  | "admin.user_updated"
  | "admin.user_deleted"
  | "admin.role_changed";

export interface LogEntry {
  id: string;
  action: LogAction;
  timestamp: number; // epoch ms
  userId?: string;        // quién realizó la acción
  userEmail?: string;
  userRole?: string;      // "cliente" | "admin"
  targetId?: string;      // ID del recurso afectado (orderId, invitationId, etc.)
  targetType?: string;    // "order" | "invitation" | "page" | "template" | "user" | "settings"
  metadata?: Record<string, any>; // datos adicionales flexibles
  ip?: string;
  userAgent?: string;
  severity: "info" | "warning" | "error";
  description: string;    // texto legible para humanos
}
