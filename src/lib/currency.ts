/**
 * Marketplace money rules:
 * - Listing prices are stored / quoted in AED (platform baseline).
 * - Display currency follows the selected country (search or header).
 * - exchangeRateToAED = how many AED equal 1 unit of that currency
 *   (e.g. OMR 9.54 → 1 OMR = 9.54 AED → AED→OMR = amount / 9.54).
 */

export const BASE_CURRENCY = "AED";

export type MoneyDisplayOptions = {
  currency?: string;
  /** AED per 1 unit of display currency. Default 1 (AED). */
  exchangeRateToAED?: number;
  locale?: string;
  /** Show code (AED) vs symbol (د.إ). Default code. */
  style?: "code" | "symbol";
  currencySymbol?: string;
};

/** Convert an AED amount into the display currency. */
export function fromAed(
  amountAed: number,
  exchangeRateToAED: number = 1
): number {
  const rate = exchangeRateToAED > 0 ? exchangeRateToAED : 1;
  return amountAed / rate;
}

/** Convert a foreign amount into AED. */
export function toAed(amount: number, exchangeRateToAED: number = 1): number {
  const rate = exchangeRateToAED > 0 ? exchangeRateToAED : 1;
  return amount * rate;
}

function formatDigits(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  // OMR uses 3 decimal places in practice; others whole fils rounded for display
  if (currency === "OMR") {
    const fixed = Math.round(n * 1000) / 1000;
    const [whole, frac = ""] = String(fixed).split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return frac ? `${grouped}.${frac.padEnd(3, "0").slice(0, 3)}` : `${grouped}.000`;
  }
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Format an AED-stored amount for a target country currency. */
export function formatMoney(amountAed: number, options: MoneyDisplayOptions = {}): string {
  const currency = (options.currency || BASE_CURRENCY).toUpperCase();
  const rate = options.exchangeRateToAED ?? 1;
  const converted = fromAed(amountAed, rate);
  const digits = formatDigits(converted, currency);
  if (options.style === "symbol" && options.currencySymbol) {
    return `${options.currencySymbol} ${digits}`;
  }

  return `${currency} ${digits}`;
}

/** Country aliases used when matching search filters to listing locations. */
export const COUNTRY_SEARCH_ALIASES: Record<string, string[]> = {
  "united arab emirates": ["uae", "emirates", "ae", "united arab emirates"],
  uae: ["uae", "emirates", "ae", "united arab emirates"],
  "saudi arabia": ["saudi", "ksa", "sa", "saudi arabia"],
  saudi: ["saudi", "ksa", "sa", "saudi arabia"],
  oman: ["oman", "om", "سلطنة عمان"],
  qatar: ["qatar", "qa", "دولة قطر"],
};

export function countryMatchTokens(countryName: string): string[] {
  const key = countryName.trim().toLowerCase();
  const aliases = COUNTRY_SEARCH_ALIASES[key];
  if (aliases) return aliases;
  // Also try partial keys
  for (const [name, toks] of Object.entries(COUNTRY_SEARCH_ALIASES)) {
    if (key.includes(name) || name.includes(key)) return toks;
  }
  return [key].filter(Boolean);
}

/** True if haystack (location text) belongs to the selected country. */
export function locationMatchesCountry(
  haystack: string,
  countryName: string
): boolean {
  const h = haystack.toLowerCase();
  return countryMatchTokens(countryName).some((token) => h.includes(token));
}
