import type {
  ListingAdsSettings,
  ListingAdTargeting,
  ListingSidebarAd,
} from "./listing-ads-types";

/** Search / listings URL context used to pick a contextual sidebar ad. */
export interface ListingAdSearchContext {
  country?: string;
  state?: string;
  district?: string;
  parent?: string;
  category?: string;
  subcategory?: string;
}

export type { ListingAdTargeting };

const TARGETING_FIELDS: Array<keyof ListingAdTargeting> = [
  "country",
  "state",
  "district",
  "parent",
  "category",
  "subcategory",
];

const TARGETING_WEIGHT: Record<keyof ListingAdTargeting, number> = {
  country: 1,
  state: 2,
  district: 4,
  parent: 8,
  category: 16,
  subcategory: 32,
};

function norm(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeListingAdTargeting(
  raw?: Partial<ListingAdTargeting> | null
): ListingAdTargeting {
  const next: ListingAdTargeting = {};
  for (const key of TARGETING_FIELDS) {
    const value = raw?.[key];
    if (typeof value === "string" && value.trim()) {
      next[key] = value.trim();
    }
  }
  return next;
}

export function isGlobalListingAd(ad: ListingSidebarAd): boolean {
  const targeting = ad.targeting ?? {};
  return TARGETING_FIELDS.every((key) => !targeting[key]?.trim());
}

export function listingAdTargetingScore(
  ad: ListingSidebarAd,
  context: ListingAdSearchContext
): number {
  const targeting = ad.targeting ?? {};
  let score = 0;

  for (const key of TARGETING_FIELDS) {
    const wanted = targeting[key]?.trim();
    if (!wanted) continue;

    const actual = context[key]?.trim();
    if (!actual || norm(actual) !== norm(wanted)) {
      return -1;
    }
    score += TARGETING_WEIGHT[key];
  }

  return score;
}

export function pickBestListingAd(
  ads: ListingSidebarAd[],
  context: ListingAdSearchContext
): ListingSidebarAd | null {
  let best: ListingSidebarAd | null = null;
  let bestScore = -1;

  for (const ad of ads) {
    if (!ad.enabled || !ad.title.trim()) continue;
    const score = listingAdTargetingScore(ad, context);
    if (score < 0) continue;
    if (score > bestScore) {
      best = ad;
      bestScore = score;
    }
  }

  return best;
}

export function pickListingAdsForContext(
  settings: ListingAdsSettings,
  context: ListingAdSearchContext
): { tall: ListingSidebarAd | null; short: ListingSidebarAd | null } {
  const enabled = settings.ads.filter((ad) => ad.enabled && ad.title.trim());
  const tallCandidates = enabled.filter((ad) => ad.placement === "tall");
  const shortCandidates = enabled.filter((ad) => ad.placement === "short");

  return {
    tall: pickBestListingAd(tallCandidates, context),
    short: pickBestListingAd(shortCandidates, context),
  };
}

export function describeListingAdTargeting(ad: ListingSidebarAd): string {
  if (isGlobalListingAd(ad)) return "All searches (fallback)";

  const parts: string[] = [];
  const t = ad.targeting ?? {};
  if (t.country) parts.push(t.country);
  if (t.state) parts.push(t.state);
  if (t.district) parts.push(t.district);
  if (t.parent) parts.push(t.parent);
  if (t.category) parts.push(t.category);
  if (t.subcategory) parts.push(t.subcategory);
  return parts.join(" · ");
}
