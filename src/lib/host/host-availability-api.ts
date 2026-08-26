import type { ListingAvailabilitySettings } from "./host-availability-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export type AvailabilityState = {
  settings: ListingAvailabilitySettings;
  occupiedDates: string[];
};

export async function fetchAvailabilityState(
  listingId: string,
  opts?: { channel?: boolean }
): Promise<AvailabilityState | null> {
  const query = opts?.channel ? "?channel=1" : "";
  const res = await fetch(
    `/api/listings/${encodeURIComponent(listingId)}/availability${query}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load availability");
  const data = (await res.json()) as {
    settings: ListingAvailabilitySettings;
    occupiedDates?: string[];
  };
  return {
    settings: data.settings,
    occupiedDates: data.occupiedDates ?? [],
  };
}

export async function fetchAvailabilityFromApi(
  listingId: string,
  opts?: { channel?: boolean }
): Promise<ListingAvailabilitySettings | null> {
  const state = await fetchAvailabilityState(listingId, opts);
  return state?.settings ?? null;
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

export async function syncAvailabilityFeedsToApi(
  listingId: string
): Promise<ListingAvailabilitySettings> {
  const res = await fetch(
    `/api/listings/${encodeURIComponent(listingId)}/availability/sync`,
    { method: "POST" }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to sync calendars");
  }
  const data = (await res.json()) as { settings: ListingAvailabilitySettings };
  return data.settings;
}

export function shouldUseSharedAvailabilityStore() {
  return isSharedDbEnabled();
}
