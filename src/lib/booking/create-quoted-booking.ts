import { BookingError, confirmBooking } from "@/lib/booking/confirm-booking";
import { computeBookingQuoteFromListing } from "@/lib/booking/compute-booking-quote-from-listing";
import { ensureListingForBooking } from "@/lib/booking/ensure-listing";
import { resolveListingHostForBooking } from "@/lib/server/resolve-listing-host";
import { prisma } from "@/lib/prisma";
import type { BookingQuote } from "@/lib/booking/compute-quote";
import {
  buildGuestQuoteSnapshotFromBookingQuote,
  serializeGuestQuoteSnapshot,
} from "@/lib/booking/guest-quote-snapshot";
import { resolveBookingListingPricing } from "@/lib/booking/resolve-booking-listing-pricing";

export type QuotedBookingListing = {
  id: string;
  title: string;
  hostId?: string;
  hostName?: string;
  location?: string;
  maxGuests?: number;
  pricePerNight: number;
  instantBook?: boolean;
  currency?: string;
};

export type CreateQuotedBookingInput = {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestId: string;
  guestName?: string;
  guestEmail?: string;
  roomIds?: string[];
  experienceIds?: string[];
  extraIds?: string[];
  currency?: string;
  listing: QuotedBookingListing;
};

export async function createQuotedBooking(input: CreateQuotedBookingInput): Promise<{
  booking: Awaited<ReturnType<typeof confirmBooking>>;
  quote: BookingQuote;
}> {
  const resolvedHost = await resolveListingHostForBooking(input.listingId, input.listing);
  if (!resolvedHost) {
    throw new BookingError("Listing not found or not available", "NOT_FOUND");
  }

  await ensureListingForBooking({
    id: input.listingId,
    title: input.listing.title,
    hostId: resolvedHost.hostId,
    hostName: resolvedHost.hostName,
    location: input.listing.location,
    maxGuests: input.listing.maxGuests,
    pricePerNight: 0,
    instantBook: input.listing.instantBook,
    currency: input.listing.currency,
  });

  const quote = await computeBookingQuoteFromListing({
    listingId: input.listingId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guestCount,
    roomIds: input.roomIds,
    experienceIds: input.experienceIds,
    extraIds: input.extraIds,
    currency: input.currency,
  });

  const existingGuest = await prisma.user.findUnique({ where: { id: input.guestId } });
  if (!existingGuest) {
    await prisma.user.create({
      data: {
        id: input.guestId,
        fullName: input.guestName || "Guest",
        email: input.guestEmail || `${input.guestId}@guests.local`,
        roles: JSON.stringify(["guest"]),
      },
    });
  } else if (input.guestName || input.guestEmail) {
    await prisma.user.update({
      where: { id: input.guestId },
      data: {
        ...(input.guestName ? { fullName: input.guestName } : {}),
        ...(input.guestEmail ? { email: input.guestEmail } : {}),
      },
    });
  }

  const pricing = await resolveBookingListingPricing(input.listingId);
  const guestSnapshot = serializeGuestQuoteSnapshot(
    buildGuestQuoteSnapshotFromBookingQuote(quote, pricing.taxLabel, pricing.taxPct)
  );

  const booking = await confirmBooking({
    listingId: input.listingId,
    guestId: input.guestId,
    checkIn: new Date(`${input.checkIn}T12:00:00`),
    checkOut: new Date(`${input.checkOut}T12:00:00`),
    guestCount: input.guestCount,
    totalPrice: quote.total,
    guestQuoteSnapshot: guestSnapshot,
  });

  return { booking, quote };
}
