import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
import { normalizeListingAdTargeting } from "./listing-ad-targeting";
import type { ListingAdsSettings, ListingSidebarAd } from "./listing-ads-types";

const STORAGE_KEY = "farm-stays-listing-ads";
export const LISTING_ADS_SYNC_EVENT = "farm-stays-listing-ads-updated";

export const DEFAULT_LISTING_ADS: ListingAdsSettings = {
  ads: [
    {
      id: "ad-listings-tall",
      enabled: true,
      placement: "tall",
      eyebrow: "Sponsored",
      title: "List your farm stay",
      body: "Reach guests searching for farm stays and unique stays across India.",
      ctaLabel: "Get started",
      ctaHref: "/host/signup",
      imageUrl: "",
    },
  ],
};

export function newListingAdId(): string {
  return `ad-${Date.now().toString(36)}`;
}

export function emptyListingAd(): ListingSidebarAd {
  return {
    id: newListingAdId(),
    enabled: true,
    placement: "tall",
    targeting: {},
    eyebrow: "Sponsored",
    title: "",
    body: "",
    ctaLabel: "Learn more",
    ctaHref: "/host/signup",
    imageUrl: "",
  };
}

export function normalizeListingAds(
  raw: Partial<ListingAdsSettings> | ListingSidebarAd[] | null
): ListingAdsSettings {
  const ads = Array.isArray(raw) ? raw : raw?.ads;
  if (!ads?.length) return { ads: DEFAULT_LISTING_ADS.ads.map((ad) => ({ ...ad })) };
  return {
    ads: ads.map((ad, index) => ({
      id: ad.id || `ad-${index}`,
      enabled: ad.enabled !== false,
      placement: ad.placement === "short" ? "short" : "tall",
      targeting: normalizeListingAdTargeting(ad.targeting),
      eyebrow: (ad.eyebrow || "Sponsored").trim(),
      title: (ad.title || "").trim(),
      body: (ad.body || "").trim(),
      ctaLabel: (ad.ctaLabel || "Learn more").trim(),
      ctaHref: (ad.ctaHref || "/").trim() || "/",
      imageUrl: (ad.imageUrl || "").trim(),
    })),
  };
}

export function loadListingAds(): ListingAdsSettings {
  if (typeof window === "undefined") return DEFAULT_LISTING_ADS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LISTING_ADS;
    return normalizeListingAds(JSON.parse(raw) as Partial<ListingAdsSettings>);
  } catch {
    return DEFAULT_LISTING_ADS;
  }
}

export function saveListingAds(settings: ListingAdsSettings): ListingAdsSettings {
  const next = normalizeListingAds(settings);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitSyncCustomEvent(LISTING_ADS_SYNC_EVENT);
  }
  return next;
}

export function enabledListingAds(settings: ListingAdsSettings): ListingSidebarAd[] {
  return settings.ads.filter((ad) => ad.enabled && ad.title.trim());
}
