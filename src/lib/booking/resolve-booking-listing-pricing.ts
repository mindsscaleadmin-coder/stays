import { BookingError } from "@/lib/booking/confirm-booking";
import { defaultForListing } from "@/lib/host/host-pricing-data";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { isSharedDbEnabled } from "@/lib/shared-db";

/** Resolve pricing for checkout — never falls back to mock defaults when shared DB is on. */
export async function resolveBookingListingPricing(
  listingId: string
): Promise<ListingPricingSettings> {
  const pricing = await getListingPricing(listingId);
  if (pricing) return pricing;
  if (!isSharedDbEnabled()) return defaultForListing(listingId);
  throw new BookingError("Listing pricing is not configured", "NOT_FOUND");
}
