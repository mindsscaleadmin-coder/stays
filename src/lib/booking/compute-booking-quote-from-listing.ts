import { calculateStayQuote } from "@/lib/host/calculate-stay-price";
import { defaultForListing } from "@/lib/host/host-pricing-data";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { sumExperienceTotal } from "@/lib/booking/experience-prices";
import type { BookingQuote } from "@/lib/booking/compute-quote";
import { computeBookingQuote } from "@/lib/booking/compute-quote";

export async function computeBookingQuoteFromListing(input: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  roomIds?: string[];
  experienceIds?: string[];
  extraIds?: string[];
  /** Fallback when pricing row missing (catalog base price × nights). */
  fallbackNightlyRate?: number;
  /** Client-sent accommodation — used only when pricing cannot be loaded. */
  fallbackAccommodation?: number;
  currency?: string;
}): Promise<BookingQuote> {
  const experiencesTotal = sumExperienceTotal(input.experienceIds ?? [], input.guestCount);
  const pricing =
    (await getListingPricing(input.listingId)) ??
    defaultForListing(input.listingId);

  const selectedExtras = (pricing.extraCharges ?? []).filter((e) =>
    (input.extraIds ?? []).includes(e.id)
  );

  const stayQuote = calculateStayQuote({
    settings: pricing,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guestCount,
    roomIds: input.roomIds?.length ? input.roomIds : undefined,
    selectedExtras,
    experiencesTotal,
  });

  if (stayQuote) {
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

  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${input.checkOut}T12:00:00`).getTime() -
        new Date(`${input.checkIn}T12:00:00`).getTime()) /
        86_400_000
    )
  );
  const nightly = input.fallbackNightlyRate ?? pricing.basePrice ?? 0;
  const accommodation =
    input.fallbackAccommodation != null
      ? input.fallbackAccommodation
      : nightly * nights;

  return computeBookingQuote({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guestCount,
    accommodation,
    experiencesTotal,
    extrasTotal: 0,
    taxAmount: 0,
    currency: input.currency || pricing.currency,
  });
}
