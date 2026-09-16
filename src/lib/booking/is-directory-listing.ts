import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";

/** Events and dining are directory listings — enquire-only, no guest checkout. */
export function isDirectoryListing(input: {
  parentCategory?: string | null;
  type?: string | null;
  category?: string | null;
}): boolean {
  return isEventListing(input) || isDiningListing(input);
}
