import {
  DETAIL_REVIEWS,
  PROPERTY_HIGHLIGHTS,
  RATING_BREAKDOWN,
} from "@/lib/mock/data";
import { getListingFeatureIcon } from "@/lib/listings/listing-feature-icons";
import { DEFAULT_LISTING_FEATURE_ICON_ROWS } from "@/lib/listings/listing-feature-icons";
import type {
  ListingGuestReview,
  ListingRatingCategory,
  ListingSettings,
  ResolvedListingFeatureIcon,
} from "./listing-settings-types";

import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-listing-settings";
export const LISTING_SETTINGS_SYNC_EVENT = "farm-stays-listing-settings-updated";

export const DEFAULT_LISTING_SETTINGS: ListingSettings = {
  highlights: PROPERTY_HIGHLIGHTS.map((label, index) => ({
    id: `hl-${index + 1}`,
    label,
    enabled: true,
  })),
  featureIcons: DEFAULT_LISTING_FEATURE_ICON_ROWS.map((row, index) => ({
    id: `fi-${index + 1}`,
    label: row.label,
    iconKey: row.iconKey,
    enabled: true,
  })),
  ratingCategories: RATING_BREAKDOWN.map((row, index) => ({
    id: `rc-${index + 1}`,
    label: row.label,
    score: row.score,
    enabled: true,
  })),
  guestReviews: DETAIL_REVIEWS.map((row, index) => ({
    id: `gr-${index + 1}`,
    name: row.name,
    location: row.location,
    rating: row.rating,
    text: row.text,
    avatar: row.avatar,
    date: row.date,
    helpful: row.helpful,
    enabled: true,
  })),
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(LISTING_SETTINGS_SYNC_EVENT);
  }
}

function mergeSettings(parsed: Partial<ListingSettings>): ListingSettings {
  return {
    highlights:
      parsed.highlights && parsed.highlights.length > 0
        ? parsed.highlights
        : DEFAULT_LISTING_SETTINGS.highlights,
    featureIcons:
      parsed.featureIcons && parsed.featureIcons.length > 0
        ? parsed.featureIcons
        : DEFAULT_LISTING_SETTINGS.featureIcons,
    ratingCategories:
      parsed.ratingCategories && parsed.ratingCategories.length > 0
        ? parsed.ratingCategories
        : DEFAULT_LISTING_SETTINGS.ratingCategories,
    guestReviews:
      parsed.guestReviews && parsed.guestReviews.length > 0
        ? parsed.guestReviews
        : DEFAULT_LISTING_SETTINGS.guestReviews,
  };
}

export function loadListingSettings(): ListingSettings {
  if (typeof window === "undefined") return DEFAULT_LISTING_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LISTING_SETTINGS;
    return mergeSettings(JSON.parse(raw) as Partial<ListingSettings>);
  } catch {
    return DEFAULT_LISTING_SETTINGS;
  }
}

export function saveListingSettings(settings: ListingSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  dispatchSync();
}

export function newListingHighlightId(): string {
  return `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newListingFeatureIconId(): string {
  return `fi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newListingRatingCategoryId(): string {
  return `rc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newListingGuestReviewId(): string {
  return `gr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getEnabledHighlights(settings: ListingSettings = loadListingSettings()) {
  return settings.highlights.filter((h) => h.enabled);
}

export function getEnabledFeatureIcons(settings: ListingSettings = loadListingSettings()) {
  return settings.featureIcons.filter((f) => f.enabled);
}

export function getEnabledRatingCategories(settings: ListingSettings = loadListingSettings()) {
  return settings.ratingCategories.filter((r) => r.enabled);
}

export function getEnabledGuestReviews(settings: ListingSettings = loadListingSettings()) {
  return settings.guestReviews.filter((r) => r.enabled);
}

export function resolveRatingCategories(
  locale: string,
  settings: ListingSettings = loadListingSettings()
): { label: string; score: number }[] {
  return getEnabledRatingCategories(settings).map((r) => ({
    label: r.label,
    score: r.score,
  }));
}

export function resolveGuestReviews(
  settings: ListingSettings = loadListingSettings()
): Omit<ListingGuestReview, "enabled">[] {
  return getEnabledGuestReviews(settings).map(({ enabled: _e, ...rest }) => rest);
}

export function resolveHighlightLabels(
  ids: string[],
  locale: string,
  settings: ListingSettings = loadListingSettings()
): string[] {
  const map = new Map(settings.highlights.map((h) => [h.id, h]));
  return ids
    .map((id) => {
      const item = map.get(id);
      if (!item) return null;
      return item.label;
    })
    .filter((label): label is string => Boolean(label));
}

export function resolveFeatureIcons(
  ids: string[],
  locale: string,
  settings: ListingSettings = loadListingSettings()
): ResolvedListingFeatureIcon[] {
  const map = new Map(settings.featureIcons.map((f) => [f.id, f]));
  return ids
    .map((id) => {
      const item = map.get(id);
      if (!item) return null;
      return {
        id: item.id,
        label: item.label,
        iconKey: item.iconKey,
      };
    })
    .filter((item): item is ResolvedListingFeatureIcon => Boolean(item));
}

export { getListingFeatureIcon };
