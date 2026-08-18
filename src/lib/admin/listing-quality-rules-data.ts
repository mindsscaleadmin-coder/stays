import type { ListingQualityRules } from "./listing-quality-rules-types";
import { emitSyncCustomEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-listing-quality-rules";
export const LISTING_QUALITY_RULES_SYNC_EVENT = "farm-stays-listing-quality-rules-updated";

export const DEFAULT_LISTING_QUALITY_RULES: ListingQualityRules = {
  minPhotos: 1,
  requireTitle: true,
  requireDescription: true,
  minDescriptionLength: 50,
  requireLocation: true,
  requireCategory: true,
  requireFarmType: false,
  requireAmenities: false,
  minAmenities: 0,
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(LISTING_QUALITY_RULES_SYNC_EVENT);
  }
}

export function loadListingQualityRules(): ListingQualityRules {
  if (typeof window === "undefined") return DEFAULT_LISTING_QUALITY_RULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LISTING_QUALITY_RULES;
    return { ...DEFAULT_LISTING_QUALITY_RULES, ...(JSON.parse(raw) as Partial<ListingQualityRules>) };
  } catch {
    return DEFAULT_LISTING_QUALITY_RULES;
  }
}

export function saveListingQualityRules(rules: ListingQualityRules): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  dispatchSync();
}
