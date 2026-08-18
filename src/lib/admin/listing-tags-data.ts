import {
  FARM_ACTIVITY_OPTIONS,
  FARM_TYPE_OPTIONS,
  LISTING_AMENITY_OPTIONS,
} from "@/lib/listings/listing-field-options";
import type {
  ListingTagGroup,
  ListingTagInput,
  ListingTagItem,
  ListingTagsCatalog,
} from "./listing-tags-types";

import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-listing-tags";
export const LISTING_TAGS_SYNC_EVENT = "farm-stays-listing-tags-updated";

function seedTags(labels: readonly string[], prefix: string): ListingTagItem[] {
  return labels.map((label, index) => ({
    id: `${prefix}-${index + 1}`,
    label,
    enabled: true,
  }));
}

export const DEFAULT_LISTING_TAGS: ListingTagsCatalog = {
  farmTypes: seedTags(FARM_TYPE_OPTIONS, "ft"),
  activities: seedTags(FARM_ACTIVITY_OPTIONS, "fa"),
  amenities: seedTags(LISTING_AMENITY_OPTIONS, "am"),
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(LISTING_TAGS_SYNC_EVENT);
  }
}

function mergeGroup(
  parsed: ListingTagItem[] | undefined,
  fallback: ListingTagItem[]
): ListingTagItem[] {
  return parsed && parsed.length > 0 ? parsed : fallback;
}

function mergeCatalog(parsed: Partial<ListingTagsCatalog>): ListingTagsCatalog {
  return {
    farmTypes: mergeGroup(parsed.farmTypes, DEFAULT_LISTING_TAGS.farmTypes),
    activities: mergeGroup(parsed.activities, DEFAULT_LISTING_TAGS.activities),
    amenities: mergeGroup(parsed.amenities, DEFAULT_LISTING_TAGS.amenities),
  };
}

export function loadListingTags(): ListingTagsCatalog {
  if (typeof window === "undefined") return DEFAULT_LISTING_TAGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LISTING_TAGS;
    return mergeCatalog(JSON.parse(raw) as Partial<ListingTagsCatalog>);
  } catch {
    return DEFAULT_LISTING_TAGS;
  }
}

export function saveListingTags(catalog: ListingTagsCatalog): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  dispatchSync();
}

export function newListingTagId(group: ListingTagGroup): string {
  const prefix = group === "farmTypes" ? "ft" : group === "activities" ? "fa" : "am";
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getEnabledTagLabels(
  group: ListingTagGroup,
  catalog: ListingTagsCatalog = loadListingTags()
): string[] {
  return catalog[group].filter((t) => t.enabled).map((t) => t.label);
}

export function addListingTag(
  catalog: ListingTagsCatalog,
  group: ListingTagGroup,
  input: ListingTagInput
): ListingTagsCatalog {
  const item: ListingTagItem = {
    id: newListingTagId(group),
    label: input.label.trim(),
    enabled: input.enabled ?? true,
  };
  return { ...catalog, [group]: [...catalog[group], item] };
}

export function updateListingTag(
  catalog: ListingTagsCatalog,
  group: ListingTagGroup,
  id: string,
  updates: Partial<ListingTagInput>
): ListingTagsCatalog {
  return {
    ...catalog,
    [group]: catalog[group].map((t) =>
      t.id === id
        ? {
            ...t,
            ...(updates.label !== undefined ? { label: updates.label.trim() } : {}),
            ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
          }
        : t
    ),
  };
}

export function removeListingTag(
  catalog: ListingTagsCatalog,
  group: ListingTagGroup,
  id: string
): ListingTagsCatalog {
  return { ...catalog, [group]: catalog[group].filter((t) => t.id !== id) };
}

export function resetListingTagGroup(
  catalog: ListingTagsCatalog,
  group: ListingTagGroup
): ListingTagsCatalog {
  return { ...catalog, [group]: DEFAULT_LISTING_TAGS[group] };
}
