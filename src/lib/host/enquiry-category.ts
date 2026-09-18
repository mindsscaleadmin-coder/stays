import { isDiningListing } from "@/lib/booking/is-dining-listing";
import type { EventAvailabilityRequest } from "@/lib/events/event-availability-types";

export type EnquiryCategory = "event" | "dining";
export type EnquiryCategoryFilter = EnquiryCategory | "all";

export type ListingCategoryInput = {
  parentCategory?: string | null;
  category?: string | null;
  type?: string | null;
};

export function enquiryCategoryForListing(
  listing: ListingCategoryInput | null | undefined
): EnquiryCategory {
  if (isDiningListing(listing ?? {})) return "dining";
  return "event";
}

export function enquiryCategoryLabel(category: EnquiryCategory): string {
  return category === "dining" ? "Dining" : "Event";
}

export function enquiryCategoryForRequest(
  request: EventAvailabilityRequest,
  listingsById: Map<string, ListingCategoryInput>
): EnquiryCategory {
  const listing = listingsById.get(request.listingId);
  return enquiryCategoryForListing(listing);
}

export function filterEnquiriesByCategory<T extends EventAvailabilityRequest>(
  requests: T[],
  category: EnquiryCategoryFilter,
  listingsById: Map<string, ListingCategoryInput>
): T[] {
  if (category === "all") return requests;
  return requests.filter(
    (request) => enquiryCategoryForRequest(request, listingsById) === category
  );
}
