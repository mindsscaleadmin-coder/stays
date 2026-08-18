import type { CountryPricingConfig } from "@/lib/admin/country-utils";
import type { ListingPricingSettings } from "./host-pricing-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export async function fetchPricingFromApi(
  listingId: string,
  country?: CountryPricingConfig
): Promise<ListingPricingSettings | null> {
  const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}/pricing`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load pricing");
  const data = (await res.json()) as { settings: ListingPricingSettings };
  let settings = data.settings;
  if (country) {
    const { applyCountryPricing } = await import("./host-pricing-data");
    settings = applyCountryPricing(settings, country);
  }
  return settings;
}

export async function savePricingToApi(
  settings: ListingPricingSettings
): Promise<ListingPricingSettings> {
  const res = await fetch(`/api/listings/${encodeURIComponent(settings.listingId)}/pricing`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save pricing");
  }
  const data = (await res.json()) as { settings: ListingPricingSettings };
  return data.settings;
}

export function shouldUseSharedPricingStore() {
  return isSharedDbEnabled();
}
