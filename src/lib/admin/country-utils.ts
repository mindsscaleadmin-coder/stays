import type { Country as TaxonomyCountry } from "@/lib/admin/taxonomy-types";
import { ALL_COUNTRIES, type Country as PlatformCountry } from "@/lib/mock/countries";
import { BASE_CURRENCY } from "@/lib/currency";

/** Common listing country name aliases → ISO code for lookup. */
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  uae: "AE",
  "united arab emirates": "AE",
  emirates: "AE",
  ksa: "SA",
  "saudi arabia": "SA",
  saudi: "SA",
  oman: "OM",
  qatar: "QA",
  india: "IN",
};

export interface CountryPricingConfig {
  countryId: string;
  countryName: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  exchangeRateToAED: number;
  taxPct: number;
  taxLabel: string;
}

/** Countries available in search, listing forms, and admin filters. */
export function filterActiveCountries(countries: TaxonomyCountry[]): TaxonomyCountry[] {
  return countries.filter((c) => c.enabled !== false);
}

/** Find admin country by listing country name (supports common aliases). */
export function findCountryByListingName(
  countries: TaxonomyCountry[],
  listingCountry?: string
): TaxonomyCountry | null {
  if (!listingCountry?.trim()) return null;
  const normalized = listingCountry.trim().toLowerCase();

  const byId = countries.find((c) => c.id === listingCountry.trim());
  if (byId) return byId;

  const byName = countries.find((c) => c.name.toLowerCase() === normalized);
  if (byName) return byName;

  const byCode = countries.find((c) => c.code?.toLowerCase() === normalized);
  if (byCode) return byCode;

  const aliasCode = COUNTRY_NAME_ALIASES[normalized];
  if (aliasCode) {
    const byAlias = countries.find((c) => c.code?.toUpperCase() === aliasCode);
    if (byAlias) return byAlias;
  }

  return (
    countries.find((c) => c.name.toLowerCase().includes(normalized)) ??
    countries.find((c) => normalized.includes(c.name.toLowerCase())) ??
    null
  );
}

/** Resolve a stored country value (id, code, or name) to a taxonomy country id. */
export function resolveCountryId(
  countries: TaxonomyCountry[],
  stored?: string | null
): string {
  if (!stored?.trim()) return "";
  return findCountryByListingName(countries, stored)?.id ?? "";
}

/** Pricing defaults derived from an admin country record. */
export function countryPricingConfig(country: TaxonomyCountry): CountryPricingConfig {
  return {
    countryId: country.id,
    countryName: country.name,
    flag: country.flag ?? "🏳️",
    currency: country.currency ?? BASE_CURRENCY,
    currencySymbol: country.currencySymbol ?? "د.إ",
    exchangeRateToAED: country.exchangeRateToAED ?? 1,
    taxPct: country.taxPct ?? 5,
    taxLabel: country.taxLabel ?? "VAT",
  };
}

/** Resolve listing country name to admin pricing config, with fallback to first country. */
export function resolveCountryPricingConfig(
  countries: TaxonomyCountry[],
  listingCountry?: string
): CountryPricingConfig {
  const match =
    findCountryByListingName(countries, listingCountry) ??
    countries.find((c) => c.enabled !== false) ??
    countries[0];

  if (!match) {
    return {
      countryId: "",
      countryName: "United Arab Emirates",
      flag: "🇦🇪",
      currency: BASE_CURRENCY,
      currencySymbol: "د.إ",
      exchangeRateToAED: 1,
      taxPct: 5,
      taxLabel: "VAT",
    };
  }

  return countryPricingConfig(match);
}

const EXTRA_MARKETPLACE_DEFAULTS: PlatformCountry[] = [
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    currencySymbol: "₹",
    exchangeRateToAED: 0.043,
    dialCode: "+91",
    enabled: true,
    comingSoon: false,
  },
];

/** Fill empty New country fields from a known code or English name. */
export function suggestCountryMarketplace(query?: string): PlatformCountry | null {
  const q = query?.trim().toLowerCase();
  if (!q) return null;
  const list = [...ALL_COUNTRIES, ...EXTRA_MARKETPLACE_DEFAULTS];
  return (
    list.find((c) => c.code.toLowerCase() === q) ??
    list.find((c) => c.name.toLowerCase() === q) ??
    null
  );
}

export function toPlatformCountry(c: TaxonomyCountry): PlatformCountry {
  return {
    code: (c.code ?? c.id).toUpperCase(),
    name: c.name,
    flag: c.flag ?? "🏳️",
    currency: c.currency ?? BASE_CURRENCY,
    currencySymbol: c.currencySymbol ?? "د.إ",
    exchangeRateToAED: c.exchangeRateToAED ?? 1,
    dialCode: c.dialCode ?? "",
    enabled: c.enabled !== false && !c.comingSoon,
    comingSoon: Boolean(c.comingSoon),
  };
}
