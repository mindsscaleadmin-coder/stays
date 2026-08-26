import { locationMatchesCountry } from "@/lib/currency";
import type { SubmittedListing } from "./submission-types";

export type ListingSearchFilters = {
  status?: SubmittedListing["status"];
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  parentCategory?: string;
  category?: string;
  subcategory?: string;
  q?: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasFilterValue(value?: string): value is string {
  return Boolean(value && value.trim());
}

export function listingSearchHasFilters(filters: ListingSearchFilters): boolean {
  return (
    hasFilterValue(filters.status) ||
    hasFilterValue(filters.country) ||
    hasFilterValue(filters.state) ||
    hasFilterValue(filters.district) ||
    hasFilterValue(filters.city) ||
    hasFilterValue(filters.parentCategory) ||
    hasFilterValue(filters.category) ||
    hasFilterValue(filters.subcategory) ||
    hasFilterValue(filters.q)
  );
}

/** Server-safe Filter match used by GET /api/listings and public search. */
export function submittedListingMatches(
  listing: SubmittedListing,
  filters: ListingSearchFilters
): boolean {
  if (hasFilterValue(filters.status) && listing.status !== filters.status) {
    return false;
  }
  if (hasFilterValue(filters.country)) {
    const haystack = `${listing.country} ${listing.state} ${listing.district}`;
    if (!locationMatchesCountry(haystack, filters.country)) return false;
  }
  if (hasFilterValue(filters.state) && normalize(listing.state) !== normalize(filters.state)) {
    return false;
  }
  if (
    hasFilterValue(filters.district) &&
    normalize(listing.district) !== normalize(filters.district)
  ) {
    return false;
  }
  if (hasFilterValue(filters.city) && normalize(listing.city) !== normalize(filters.city)) {
    return false;
  }
  if (
    hasFilterValue(filters.parentCategory) &&
    normalize(listing.parentCategory) !== normalize(filters.parentCategory)
  ) {
    return false;
  }
  if (
    hasFilterValue(filters.category) &&
    normalize(listing.category ?? "") !== normalize(filters.category)
  ) {
    return false;
  }
  if (
    hasFilterValue(filters.subcategory) &&
    normalize(listing.subcategory) !== normalize(filters.subcategory)
  ) {
    return false;
  }
  if (hasFilterValue(filters.q)) {
    const q = normalize(filters.q);
    const haystack = [
      listing.title,
      listing.description,
      listing.country,
      listing.state,
      listing.district,
      listing.city,
      listing.parentCategory,
      listing.category,
      listing.subcategory,
      listing.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}
