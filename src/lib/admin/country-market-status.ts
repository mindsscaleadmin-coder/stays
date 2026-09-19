import { findCountryByListingName } from "@/lib/admin/country-utils";
import type { Country, CountryInput } from "@/lib/admin/taxonomy-types";
import type { SubmittedListing } from "@/lib/listings/submission-types";

/** Guest-facing marketplace visibility for an admin country row. */
export type CountryMarketStatus = "live" | "coming_soon" | "hidden";

export const COUNTRY_MARKET_STATUS_LABELS: Record<CountryMarketStatus, string> = {
  live: "Live",
  coming_soon: "Coming soon",
  hidden: "Hidden",
};

export function getCountryMarketStatus(country: {
  enabled?: boolean;
  comingSoon?: boolean;
}): CountryMarketStatus {
  if (country.enabled === false) return "hidden";
  if (country.comingSoon) return "coming_soon";
  return "live";
}

/** True when guests can browse/book in this market (header switcher + filters). */
export function isCountryMarketLive(country: {
  enabled?: boolean;
  comingSoon?: boolean;
}): boolean {
  return getCountryMarketStatus(country) === "live";
}

export function countLiveCountries(countries: Country[]): number {
  return countries.filter((c) => isCountryMarketLive(c)).length;
}

export function countryToInput(country: Country): CountryInput {
  return {
    id: country.id,
    name: country.name,
    code: country.code ?? "",
    flag: country.flag ?? "",
    currency: country.currency ?? "",
    currencySymbol: country.currencySymbol ?? "",
    exchangeRateToAED: country.exchangeRateToAED ?? 1,
    taxPct: country.taxPct ?? 5,
    taxLabel: country.taxLabel ?? "VAT",
    dialCode: country.dialCode ?? "",
    enabled: country.enabled !== false,
    comingSoon: Boolean(country.comingSoon),
  };
}

export function applyMarketStatus(
  input: CountryInput,
  status: CountryMarketStatus
): CountryInput {
  switch (status) {
    case "live":
      return { ...input, enabled: true, comingSoon: false };
    case "coming_soon":
      return { ...input, enabled: true, comingSoon: true };
    case "hidden":
      return { ...input, enabled: false, comingSoon: false };
  }
}

export function shouldConfirmMarketStatusChange(options: {
  country: Country;
  countries: Country[];
  nextStatus: CountryMarketStatus;
  listingsInCountry?: number;
}): { required: boolean; message: string } | null {
  const { country, countries, nextStatus, listingsInCountry = 0 } = options;
  const current = getCountryMarketStatus(country);
  if (current === nextStatus) return null;

  const liveCount = countLiveCountries(countries);
  const wasLive = isCountryMarketLive(country);

  if (nextStatus === "hidden" && wasLive) {
    if (liveCount <= 1) {
      return {
        required: true,
        message:
          `"${country.name}" is the only live market. Hiding it means guests will have no active country on the public site. Continue anyway?`,
      };
    }
    if (listingsInCountry > 0) {
      return {
        required: true,
        message:
          `Hide "${country.name}" from the public site? ${listingsInCountry} listing(s) are tagged with this country. They will remain in the database but may disappear from browse filters.`,
      };
    }
    return {
      required: true,
      message: `Hide "${country.name}" from filters and the guest country switcher?`,
    };
  }

  if (nextStatus === "coming_soon" && wasLive) {
    return {
      required: true,
      message:
        `Mark "${country.name}" as coming soon? It will stay in admin but disappear from the guest site and country switcher.`,
    };
  }

  if (nextStatus === "live" && !wasLive) {
    const otherLive = liveCount - (wasLive ? 1 : 0);
    if (otherLive >= 1) {
      return {
        required: true,
        message:
          `Make "${country.name}" live? Guests will be able to switch between ${otherLive + 1} active markets in the header.`,
      };
    }
  }

  return null;
}

/** Count listings whose country field resolves to this taxonomy country. */
export function countListingsForCountry(
  countries: Country[],
  country: Country,
  listings: SubmittedListing[]
): number {
  return listings.filter((listing) => {
    const match = findCountryByListingName(countries, listing.country);
    return match?.id === country.id;
  }).length;
}
