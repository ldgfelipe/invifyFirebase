// ============================================================================
// FORMATO DE MONEDA - Configurable para MXN (default) u otras
// ============================================================================

export type Currency = "mxn" | "usd" | "idr" | "eur";

export const DEFAULT_CURRENCY: Currency = "mxn";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  mxn: "$",
  usd: "$",
  idr: "Rp",
  eur: "€",
};

export const CURRENCY_LOCALES: Record<Currency, string> = {
  mxn: "es-MX",
  usd: "en-US",
  idr: "id-ID",
  eur: "de-DE",
};

/** Formatea un precio en centavos a string legible */
export function formatPrice(cents: number, currency: Currency = DEFAULT_CURRENCY): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback simple
    const symbol = CURRENCY_SYMBOLS[currency] ?? "$";
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
}

/** Formatea precio con decimales si es necesario (para USD/EUR) */
export function formatPriceWithDecimals(cents: number, currency: Currency = DEFAULT_CURRENCY): string {
  const amount = cents / 100;
  const maxDecimals = currency === "mxn" ? 0 : 2;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    }).format(amount);
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] ?? "$";
    const fixed = amount.toFixed(maxDecimals);
    return `${symbol}${Number(fixed).toLocaleString()}`;
  }
}

/** Obtiene el símbolo de la moneda */
export function getCurrencySymbol(currency: Currency = DEFAULT_CURRENCY): string {
  return CURRENCY_SYMBOLS[currency] ?? "$";
}