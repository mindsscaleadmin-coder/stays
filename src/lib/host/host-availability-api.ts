import type { ListingAvailabilitySettings } from "./host-availability-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export async function fetchAvailabilityFromApi(
  listingId: string
): Promise<ListingAvailabilitySettings | null> {
  const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}/availability`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load availability");
  const data = (await res.json()) as { settings: ListingAvailabilitySettings };
  return data.settings;
}

export async function saveAvailabilityToApi(
  settings: ListingAvailabilitySettings
): Promise<ListingAvailabilitySettings> {
  const res = await fetch(`/api/listings/${encodeURIComponent(settings.listingId)}/availability`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save availability");
  }
  const data = (await res.json()) as { settings: ListingAvailabilitySettings };
  return data.settings;
}

export function shouldUseSharedAvailabilityStore() {
  return isSharedDbEnabled();
}
