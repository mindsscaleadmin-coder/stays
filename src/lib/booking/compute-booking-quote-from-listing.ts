import { calculateStayQuote } from "@/lib/host/calculate-stay-price";
import { defaultForListing } from "@/lib/host/host-pricing-data";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { sumExperienceTotal } from "@/lib/booking/experience-prices";
import type { BookingQuote } from "@/lib/booking/compute-quote";
import { computeBookingQuote } from "@/lib/booking/compute-quote";
import { BookingError } from "@/lib/booking/confirm-booking";

export async function computeBookingQuoteFromListing(input: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  roomIds?: string[];
  experienceIds?: string[];
  extraIds?: string[];
  currency?: string;
}): Promise<BookingQuote> {
  const experiencesTotal = sumExperienceTotal(input.experienceIds ?? [], input.guestCount);
  const pricing =
    (await getListingPricing(input.listingId)) ??
    defaultForListing(input.listingId);

  const selectedExtras = pricing.extraChargesEnabled
    ? (pricing.extraCharges ?? []).filter((e) => (input.extraIds ?? []).includes(e.id))
    : [];

  const stayQuote = calculateStayQuote({
    settings: pricing,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guestCount,
    roomIds: input.roomIds?.length ? input.roomIds : undefined,
    selectedExtras,
    experiencesTotal,
  });

  if (!stayQuote) {
    throw new BookingError("Select valid check-in and check-out dates", "INVALID_DATES");
  }

  const accommodation = Math.max(
    0,
    stayQuote.accommodationSubtotal - stayQuote.discountAmount
  );
  return computeBookingQuote({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guestCount,
    accommodation,
    experiencesTotal: stayQuote.experiencesTotal,
    extrasTotal: stayQuote.extrasTotal,
    taxAmount: stayQuote.taxAmount,
    currency: stayQuote.currency || input.currency || pricing.currency,
  });
}

