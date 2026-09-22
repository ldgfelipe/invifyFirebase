// ============================================================================
// PRECIOS POR IDIOMA - Cada precio declara en qué idiomas se muestra.
// Precio base (MXN) por defecto en Español; Precio USD por defecto en Inglés.
// Un plan solo se muestra en un idioma si al menos un precio con monto > 0
// está configurado para aparecer en ese idioma. Si no hay precio: nada.
// ============================================================================

import type { Plan, PriceLocaleScope } from "./types";
import type { Locale } from "./i18n/dictionaries";
import { formatPrice, type Currency } from "./currency";

export const DEFAULT_SCOPE_ES: PriceLocaleScope = "es";
export const DEFAULT_SCOPE_USD: PriceLocaleScope = "en";

export interface DisplayPrice {
  cents: number;
  currency: Currency;
  label: string;
  source: "base" | "usd";
}

function showsIn(scope: PriceLocaleScope | undefined, locale: Locale, fallback: PriceLocaleScope) {
  const s = scope ?? fallback;
  return s === "both" || s === locale;
}

function toCurrency(currency: string | undefined): Currency {
  const c = (currency ?? "mxn").toLowerCase() as Currency;
  return c in { mxn: 1, usd: 1, idr: 1, eur: 1 } ? c : "mxn";
}

/** Obtiene el precio a mostrar según el idioma, o null si ninguno aplica. */
export function getPlanDisplayPrice(plan: Plan, locale: Locale): DisplayPrice | null {
  const baseCents = Number(plan.price ?? 0);
  const usdCents = Number(plan.price_usd ?? 0);

  const baseVisible = baseCents > 0 && showsIn(plan.price_es_appears_in, locale, DEFAULT_SCOPE_ES);
  const usdVisible = usdCents > 0 && showsIn(plan.price_usd_appears_in, locale, DEFAULT_SCOPE_USD);

  const basePrice = (): DisplayPrice => {
    const currency = toCurrency(plan.currency);
    return { cents: baseCents, currency, label: formatPrice(baseCents, currency), source: "base" };
  };
  const usdPrice = (): DisplayPrice => ({
    cents: usdCents,
    currency: "usd",
    label: formatPrice(usdCents, "usd"),
    source: "usd",
  });

  if (locale === "en") {
    if (usdVisible) return usdPrice();
    if (baseVisible) return basePrice();
    return null;
  }

  if (baseVisible) return basePrice();
  if (usdVisible) return usdPrice();
  return null;
}

/** Indica si el plan debe mostrarse en el idioma actual (algún precio visible con monto). */
export function isPlanVisible(plan: Plan, locale: Locale): boolean {
  return getPlanDisplayPrice(plan, locale) !== null;
}