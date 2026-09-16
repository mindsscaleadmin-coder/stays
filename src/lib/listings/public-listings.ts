import type { Stay } from "@/lib/mock/data";
import { loadActiveSubmissions } from "./submission-data";
import { submissionToStay } from "./submission-to-stay";
import type { SubmittedListing } from "./submission-types";
import { hasStoredPricing, loadPricingSettings } from "@/lib/host/host-pricing-data";
import { getActiveFlashDeal, stayHasLiveFlashDeal } from "@/lib/host/flash-deal-utils";
import { getActivePromotedListingIds } from "@/lib/host/host-promotions-data";
import { locationMatchesCountry } from "@/lib/currency";
import { submittedListingMatches } from "./match-listing";
import { loadTaxonomy } from "@/lib/admin/taxonomy-data";
import type { TaxonomyData } from "@/lib/admin/taxonomy-types";
import { applyGuestReviewRatings } from "@/lib/booking/stay-reviews-data";
import { isDirectoryListing } from "@/lib/booking/is-directory-listing";
import { isEventsSubscriptionActive } from "@/lib/host/events-subscription";
import { eventsDirectoryIsFree } from "@/lib/admin/events-subscription";
import { loadFinancialSettings } from "@/lib/admin/financial-data";
import { loadHostPublicProfile } from "@/lib/host/host-profile-data";

export interface SearchCriteria {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  parentCategory?: string;
  category?: string;
  subcategory?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  advancedIds?: string[];
}

export type SortOption = "recommended" | "price_asc" | "price_desc" | "rating_desc" | "newest";

const QUICK_FILTER_TERMS: Record<string, string[]> = {
  nearby: [],
  hills: ["hill", "hatta", "mountain"],
  jungle: ["jungle", "forest", "garden"],
  sharjah: ["sharjah", "kalba"],
  fujairah: ["fujairah"],
};

function stayHaystack(stay: Stay): string {
  return [
    stay.name,
    stay.location,
    stay.category,
    stay.subcategory,
    stay.parentCategory,
    stay.type,
    stay.badge,
    ...(stay.amenities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Apply paid Featured badge / sort boost when a host promotion is active. */
function applyPaidFeaturedBadge(stay: Stay): Stay {
  if (typeof window === "undefined") return stay;
  const featuredIds = new Set(getActivePromotedListingIds("featured"));
  if (!featuredIds.has(stay.id)) return stay;
  return {
    ...stay,
    badge: "Featured",
    badgeColor: "bg-green-600",
  };
}

function featuredSortScore(stay: Stay, featuredIds: Set<string>): number {
  if (featuredIds.has(stay.id) || stay.badge === "Featured") return 1;
  return 0;
}

/** Overlay the host Pricing base rate / live flash deal onto a catalog card. */
export function applyHostPublishedRates(stay: Stay): Stay {
  if (typeof window === "undefined") return stay;
  if (!hasStoredPricing(stay.id)) {
    if (stayHasLiveFlashDeal(stay)) return stay;
    if (!stay.flashDealEndsAt) return stay;
    return {
      ...stay,
      flashDealEndsAt: undefined,
      flashDealDiscountPct: undefined,
      flashDealCurrency: undefined,
      price: stay.originalPrice && stay.originalPrice > stay.price ? stay.originalPrice : stay.price,
      originalPrice: undefined,
      priceNote: stay.priceNote?.startsWith("Flash ") ? undefined : stay.priceNote,
    };
  }

  const settings = loadPricingSettings(stay.id);
  const base = settings.basePrice > 0 ? settings.basePrice : stay.price;
  const deal = getActiveFlashDeal(settings);

  if (deal) {
    return {
      ...stay,
      price: deal.dealPrice,
      originalPrice: base > deal.dealPrice ? base : stay.originalPrice,
      priceNote: `Flash −${deal.discountPct}%`,
      flashDealEndsAt: deal.endsAt,
      flashDealDiscountPct: deal.discountPct,
      flashDealCurrency: deal.currency,
    };
  }

  const notes: string[] = [];
  if (settings.discountsEnabled) {
    if (settings.weeklyDiscountPct > 0) {
      notes.push(`${settings.weeklyDiscountPct}% weekly`);
    }
    if (settings.monthlyDiscountPct > 0) {
      notes.push(`${settings.monthlyDiscountPct}% monthly`);
    }
  }

  return {
    ...stay,
    price: base,
    originalPrice: undefined,
    flashDealEndsAt: undefined,
    flashDealDiscountPct: undefined,
    flashDealCurrency: undefined,
    priceNote: notes.length > 0 ? notes.join(" · ") : undefined,
  };
}

export function isFeaturedStay(stay: Stay, featuredIds?: Set<string>): boolean {
  if (featuredIds?.has(stay.id)) return true;
  return /featured|premium/i.test(stay.badge ?? "");
}

export function getPublicListings(): Stay[] {
  if (typeof window === "undefined") {
    return [];
  }

  const submissions = loadActiveSubmissions();
  const featuredIds = new Set([
    ...getActivePromotedListingIds("featured"),
    ...submissions.filter((l) => l.featured).map((l) => l.id),
  ]);

  const freeDirectory = eventsDirectoryIsFree(
    loadFinancialSettings().eventsSubscription
  );

  const hostApproved = submissions
    .map(submissionToStay)
    .map((stay) => applyPaidFeaturedBadge(stay))
    .filter((stay) => {
      if (freeDirectory || !isDirectoryListing(stay)) return true;
      const hostId = stay.hostId?.trim();
      if (!hostId) return false;
      return isEventsSubscriptionActive(
        loadHostPublicProfile(hostId).eventsSubscriptionExpiresAt
      );
    });

  return hostApproved
    .map(applyHostPublishedRates)
    .map(applyGuestReviewRatings)
    .sort(
      (a, b) => featuredSortScore(b, featuredIds) - featuredSortScore(a, featuredIds)
    );
}

/** Host venue listings (approved) for mega menu / venue search. */
export function isVenueStay(stay: Stay): boolean {
  if (stay.type === "venue") return true;
  const parent = normalize(stay.parentCategory ?? "");
  if (parent.includes("venue") || /\bevents?\b/.test(parent)) return true;
  if (normalize(stay.category).includes("venue")) return true;
  return false;
}

export function getVenueListings(listings: Stay[] = getPublicListings()): Stay[] {
  return listings.filter(isVenueStay);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function submissionMatches(sub: SubmittedListing, criteria: SearchCriteria): boolean {
  return submittedListingMatches(sub, {
    country: criteria.country,
    state: criteria.state,
    district: criteria.district,
    city: criteria.city,
    parentCategory: criteria.parentCategory,
    category: criteria.category,
    subcategory: criteria.subcategory,
  });
}

function liveTaxonomy(): TaxonomyData | null {
  if (typeof window === "undefined") return null;
  try {
    return loadTaxonomy();
  } catch {
    return null;
  }
}

export function stayMatchesParentCategory(stay: Stay, parentName: string): boolean {
  const parent = normalize(parentName);
  if (!parent) return true;
  if (normalize(stay.parentCategory ?? "") === parent) return true;

  const tax = liveTaxonomy();
  const row = tax?.parents.find((p) => normalize(p.name) === parent);
  if (row) {
    if (row.id === "p1") {
      return (
        stay.type === "farmstay" ||
        stay.type === "homestay" ||
        (!isVenueStay(stay) && stay.type !== "experience")
      );
    }
    if (row.id === "p2") {
      return stay.type === "experience" || stayHaystack(stay).includes("experience");
    }
    if (row.id === "p3") return isVenueStay(stay);
  }

  const isStayListing =
    stay.type === "farmstay" ||
    stay.type === "homestay" ||
    (!isVenueStay(stay) && stay.type !== "experience");

  if (parent === "stays" || parent === "farm stays" || parent === "homestays") {
    return isStayListing;
  }
  if (parent.includes("homestay") && stay.type === "homestay") return true;
  if (parent.includes("farm") && stay.type === "farmstay") return true;
  if ((parent.includes("venue") || /\bevents?\b/.test(parent)) && isVenueStay(stay)) {
    return true;
  }
  if (
    parent.includes("experience") &&
    (stay.type === "experience" || stayHaystack(stay).includes("experience"))
  ) {
    return true;
  }
  return stayHaystack(stay).includes(parent);
}

export function stayMatchesCategory(stay: Stay, categoryName: string): boolean {
  const category = normalize(categoryName);
  if (!category) return true;
  if (normalize(stay.category ?? "") === category) return true;
  if (normalize(stay.subcategory ?? "") === category) return true;
  return stayHaystack(stay).includes(category);
}

export function stayMatchesSubcategory(stay: Stay, subcategoryName: string): boolean {
  const sub = normalize(subcategoryName);
  if (!sub) return true;
  if (normalize(stay.subcategory ?? "") === sub) return true;
  if (normalize(stay.category ?? "") === sub) return true;
  return stayHaystack(stay).includes(sub);
}

function mockStayMatches(stay: Stay, criteria: SearchCriteria): boolean {
  const haystack = stayHaystack(stay);
  if (criteria.country && !locationMatchesCountry(haystack, criteria.country)) {
    return false;
  }
  if (criteria.state && !haystack.includes(normalize(criteria.state))) return false;
  if (criteria.district && !haystack.includes(normalize(criteria.district))) return false;
  if (criteria.city && !haystack.includes(normalize(criteria.city))) return false;
  if (criteria.parentCategory && !stayMatchesParentCategory(stay, criteria.parentCategory)) {
    return false;
  }
  if (criteria.category && !stayMatchesCategory(stay, criteria.category)) {
    return false;
  }
  if (criteria.subcategory && !stayMatchesSubcategory(stay, criteria.subcategory)) {
    return false;
  }
  return true;
}

function getSubmissionByStayId(id: string): SubmittedListing | undefined {
  if (typeof window === "undefined") return undefined;
  return loadActiveSubmissions().find((s) => s.id === id);
}

function matchesAdvancedFilter(
  stay: Stay,
  filterId: string,
  filterName: string,
  sub?: SubmittedListing
): boolean {
  const name = normalize(filterName);

  if (name.includes("budget") || name.includes("under aed 500")) {
    return stay.price < 500;
  }
  if (name.includes("mid-range") || name.includes("500–1500") || name.includes("500-1500")) {
    return stay.price >= 500 && stay.price <= 1500;
  }
  if (name.includes("luxury") || name.includes("1500+")) {
    return stay.price > 1500;
  }
  if (name.includes("instant")) {
    return true;
  }

  const tags = [
    ...(stay.amenities ?? []),
    ...(sub?.advancedFilters ?? []),
    ...(sub?.customFilters ?? []).map((f) => `${f.label} ${f.value}`),
  ].map(normalize);

  return tags.some((t) => t.includes(name) || name.includes(t.replace(/\s+/g, " ")));
}

function applyAdvancedFilters(
  listings: Stay[],
  advancedIds: string[],
  filterNameById: Map<string, string>
): Stay[] {
  if (advancedIds.length === 0) return listings;

  return listings.filter((stay) => {
    const sub = getSubmissionByStayId(stay.id);
    return advancedIds.every((id) => {
      const filterName = filterNameById.get(id);
      if (!filterName) return true;
      return matchesAdvancedFilter(stay, id, filterName, sub);
    });
  });
}

function applyCriteria(listings: Stay[], criteria?: SearchCriteria): Stay[] {
  if (!criteria) return listings;
  if (!criteria.country && !criteria.parentCategory && !criteria.category && !criteria.subcategory && !criteria.state && !criteria.district && !criteria.city) {
    return listings;
  }

  const approved = typeof window !== "undefined" ? loadActiveSubmissions() : [];
  const matchingHostIds = new Set(
    approved.filter((sub) => submissionMatches(sub, criteria)).map((sub) => sub.id)
  );

  return listings.filter((stay) => {
    if (matchingHostIds.has(stay.id)) return true;
    return mockStayMatches(stay, criteria);
  });
}

export function filterPublicListings(
  listings: Stay[],
  query: string,
  filter?: string,
  criteria?: SearchCriteria,
  filterNameById?: Map<string, string>
): Stay[] {
  let result = listings;

  if (filter === "deals") {
    result = result.filter((s) => stayHasLiveFlashDeal(s) || getActiveFlashDeal(loadPricingSettings(s.id)) != null);
  }

  if (filter === "trending") {
    const trendingIds =
      typeof window !== "undefined"
        ? new Set(getActivePromotedListingIds("trending"))
        : new Set<string>();
    result = result.filter(
      (s) =>
        trendingIds.has(s.id) ||
        s.badge === "Trending" ||
        /trending/i.test(s.badge ?? "")
    );
  }

  result = applyCriteria(result, criteria);

  if (criteria?.guests && criteria.guests > 0) {
    result = result.filter((stay) => stay.guests >= criteria.guests!);
  }

  if (criteria?.advancedIds?.length && filterNameById) {
    result = applyAdvancedFilters(result, criteria.advancedIds, filterNameById);
  }

  const q = query.trim().toLowerCase();
  if (!q) return result;

  if (q === "nearby") {
    // Prefer guest area from session (set on homepage geolocation).
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("farm-stays-guest-location");
        if (raw) {
          const guest = JSON.parse(raw) as {
            lat: number;
            lng: number;
            area: { aliases: string[] };
          };
          const aliases = guest.area?.aliases ?? [];
          if (aliases.length > 0) {
            const matched = result.filter((stay) => {
              const haystack = stayHaystack(stay);
              return aliases.some((alias) => haystack.includes(alias.toLowerCase()));
            });
            if (matched.length > 0) return matched;
          }
        }
      } catch {
        // ignore
      }
    }
    return result;
  }

  const terms = QUICK_FILTER_TERMS[q] ?? [q];
  return result.filter((stay) => {
    const haystack = stayHaystack(stay);
    return terms.some((term) => haystack.includes(term));
  });
}

export function sortPublicListings(listings: Stay[], sort: SortOption = "recommended"): Stay[] {
  const copy = [...listings];
  const featuredIds =
    typeof window !== "undefined"
      ? new Set(getActivePromotedListingIds("featured"))
      : new Set<string>();

  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price_desc":
      return copy.sort((a, b) => b.price - a.price);
    case "rating_desc":
      return copy.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    case "newest": {
      const subs =
        typeof window !== "undefined"
          ? new Map(loadActiveSubmissions().map((s) => [s.id, s.submittedAt]))
          : new Map<string, string>();
      return copy.sort((a, b) => {
        const aDate = subs.get(a.id);
        const bDate = subs.get(b.id);
        if (aDate && bDate) return new Date(bDate).getTime() - new Date(aDate).getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      });
    }
    default:
      // Recommended: featured (admin or paid) first, then by rating
      return copy.sort((a, b) => {
        const score = featuredSortScore(b, featuredIds) - featuredSortScore(a, featuredIds);
        if (score !== 0) return score;
        return b.rating - a.rating || b.reviews - a.reviews;
      });
  }
}

function formatDateRange(criteria?: SearchCriteria): string | null {
  if (criteria?.checkIn && criteria?.checkOut) {
    return `${criteria.checkIn} → ${criteria.checkOut}`;
  }
  if (criteria?.checkIn) return criteria.checkIn;
  if (criteria?.checkOut) return criteria.checkOut;
  return null;
}

export function formatSearchLabel(
  query: string,
  filter?: string,
  criteria?: SearchCriteria
): string {
  if (filter === "deals") return "Flash deals";
  if (filter === "trending") return "Trending stays";

  const dateRange = formatDateRange(criteria);
  const parts: string[] = [];
  if (criteria?.parentCategory) parts.push(criteria.parentCategory);
  if (criteria?.category) parts.push(criteria.category);
  if (criteria?.subcategory) parts.push(criteria.subcategory);
  if (criteria?.state) parts.push(criteria.state);
  if (criteria?.country) parts.push(criteria.country);
  if (parts.length > 0) {
    const base = parts.join(", ");
    return dateRange ? `${base} · ${dateRange}` : base;
  }

  if (dateRange) return dateRange;

  if (!query.trim() || query === "nearby") return "All stays";
  return query.charAt(0).toUpperCase() + query.slice(1);
}
