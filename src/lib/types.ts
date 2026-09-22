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
  // Entitlements de la cuenta (plan comprado, cupos y features).
  entitlements?: UserEntitlements;
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
  // Snapshot de features del plan al crearse (gating sin lookup en render).
  features?: PlanFeatures;
  // Despublicado automático por vigencia (fecha del evento + 1 día).
  unpublishedAt?: number;
  unpublishedReason?: string;
  // Ciclo de vida: el cliente puede "conservar" la invitación para no borrarla.
  retain?: boolean;
  retainedAt?: number;
  // Momento en que el barrido podrá eliminarla (despublicación + gracia).
  deleteAfter?: number;
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
// Features incluidas en un plan (gating de módulos y capacidades).
export interface PlanFeatures {
  rsvp: boolean;
  quiz: boolean;
  audio: boolean; // "Música"
  stats: boolean; // estadísticas de vistas
  allTemplates: boolean; // acceso a todo el catálogo de temas/plantillas
  prioritySupport: boolean;
}

// Derechos que un plan otorga a la cuenta.
export interface PlanEntitlements {
  planId: string;
  planName: string;
  // Cupo de invitaciones ACTIVAS simultáneas; "unlimited" para Premium.
  quota: number | "unlimited";
  features: PlanFeatures;
  interval: "one_time" | "day" | "week" | "month" | "year";
}

// Snapshot de entitlements guardado en el usuario al comprar.
export interface UserEntitlements extends PlanEntitlements {
  // Plantillas permitidas (plantillas compradas) o "all" en Premium.
  allowedTemplateIds: string[] | "all";
  // Para suscripciones (Premium): estado y vencimiento.
  subscriptionActive?: boolean;
  subscriptionExpiresAt?: number;
  updatedAt: number;
}

export interface Plan {
  id: string;
  name: string;
  name_en?: string;
  price: number; // en centavos (base, en MXN)
  currency: string;
  features: string[];
  // Entitlements del plan (si no existe, se usa el catálogo por defecto).
  entitlement?: Partial<PlanEntitlements>;
  stripePriceId: string; // legacy
  interval?: "one_time" | "day" | "week" | "month" | "year";
  stripePriceIdTest?: string;
  stripePriceIdLive?: string;
  stripeProductId?: string; // legacy
  stripeProductIdTest?: string;
  stripeProductIdLive?: string;
  price_usd?: number; // en centavos, para modo English
  price_idr?: number; // en centavos, para modo IDR
  price_es_appears_in?: PriceLocaleScope; // dónde se muestra el precio base (MXN)
  price_usd_appears_in?: PriceLocaleScope; // dónde se muestra el precio USD
}

export type PriceLocaleScope = "es" | "en" | "both";

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
  | "rsvp"
  | "text";

export interface ModuleStyle {
  background?: string; // color sólido o gradiente (ej. "#FFFBF2" o "linear-gradient(...)")
  backgroundImage?: string; // URL de imagen de fondo del módulo
  backgroundOverlay?: string; // overlay rgba sobre imagen (ej. "rgba(0,0,0,0.4)")
  textColor?: string;
  padding?: string; // ej. "40px 20px"
  borderRadius?: string; // ej. "16px"
  border?: string; // ej. "1px solid #eee"
}

interface BaseModule {
  id: string; // id estable del módulo
  type: ModuleType;
  visible: boolean;
  style?: ModuleStyle; // estilos drásticos por módulo
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

export interface TextModule extends BaseModule {
  type: "text";
  title?: string; // título opcional
  content: string; // HTML/rich text del mensaje (preserva formato)
  align?: "left" | "center" | "right" | "justify";
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
  | RsvpModule
  | TextModule;

export interface BuilderConfig {
  // Orden de render. Los módulos con visible=false se omiten.
  modules: InvitationModule[];
  // Estilos globales de la invitación.
  theme: {
    primaryColor: string;
    background: string;
    backgroundImage?: string; // imagen de fondo global de la invitación
    backgroundOverlay?: string;
    textColor?: string;
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
  heroTitle_en?: string;
  heroSubtitle: string;
  heroSubtitle_en?: string;
  heroCta: string;
  heroCta_en?: string;
  heroImage?: string;
  metaDescription: string;
  metaDescription_en?: string;

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
  | "invitation.retained"
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
