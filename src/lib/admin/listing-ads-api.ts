import { isSharedDbEnabled } from "@/lib/shared-db";
import type { ListingAdsSettings } from "./listing-ads-types";

export function shouldUseSharedListingAds() {
  return isSharedDbEnabled();
}

export async function fetchListingAdsFromApi(): Promise<ListingAdsSettings> {
  const res = await fetch("/api/platform/listing-ads", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load listing ads");
  const data = (await res.json()) as { settings: ListingAdsSettings };
  return data.settings;
}

export async function saveListingAdsToApi(
  settings: ListingAdsSettings
): Promise<ListingAdsSettings> {
  const res = await fetch("/api/platform/listing-ads", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save listing ads");
  }
  const data = (await res.json()) as { settings: ListingAdsSettings };
  return data.settings;
}
