// ============================================================================
// PAYMENTS - Tipos comunes (abstracción multi-proveedor)
// Proveedores: Stripe, PayPal, Mercado Pago.
// El mismo plan (name + price + currency) se cobra con cualquier proveedor.
// Stripe no requiere Productos/Precios para pagos únicos: se cobra directo
// con amount/currency (PaymentIntent) o price_data inline (Checkout Session).
// ============================================================================

export type PaymentProvider = "stripe" | "paypal" | "mercadopago";
export type PaymentMode = "test" | "live";

/** Contexto que todo proveedor necesita para iniciar un checkout. */
export interface CheckoutContext {
  plan: {
    id: string;
    name: string;
    price: number; // en centavos (minor units)
    currency: string; // ej. "mxn", "usd"
    interval?: string; // "one_time" | "month" | ...
    // requerido solo para suscripciones (Stripe)
    stripePriceIdTest?: string;
    stripePriceIdLive?: string;
  };
  uid: string;
  email: string;
  templateId?: string;
  mode: PaymentMode;
  origin: string; // base URL para success/cancel
  orderId: string; // id del pedido en Firestore
}

/** Resultado genérico de iniciar un checkout. */
export type CheckoutResult =
  | { type: "embedded"; provider: "stripe"; clientSecret: string; publishableKey?: string; providerRef?: string }
  | { type: "redirect"; provider: PaymentProvider; url: string; providerRef?: string };

/** Datos que los webhooks de cada proveedor deben normalizar. */
export interface ProviderPaymentData {
  provider: PaymentProvider;
  providerRef: string; // event/payment/order id del proveedor
  orderId?: string; // id del pedido en Firestore (si viene en metadata)
  status: "paid" | "failed";
  amount?: number;
  currency?: string;
}