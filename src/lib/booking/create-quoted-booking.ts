import { confirmBooking } from "@/lib/booking/confirm-booking";
import { computeBookingQuoteFromListing } from "@/lib/booking/compute-booking-quote-from-listing";
import { ensureListingForBooking } from "@/lib/booking/ensure-listing";
import { resolveListingHostForBooking } from "@/lib/server/resolve-listing-host";
import { prisma } from "@/lib/prisma";
import type { BookingQuote } from "@/lib/booking/compute-quote";
import {
  buildGuestQuoteSnapshotFromBookingQuote,
  serializeGuestQuoteSnapshot,
} from "@/lib/booking/guest-quote-snapshot";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { defaultForListing } from "@/lib/host/host-pricing-data";

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

  const resolvedHost = await resolveListingHostForBooking(input.listingId, input.listing);

  await ensureListingForBooking({
    ...input.listing,
    id: input.listingId,
    hostId: resolvedHost?.hostId ?? input.listing.hostId,
    hostName: resolvedHost?.hostName ?? input.listing.hostName,
    pricePerNight:
      input.listing.pricePerNight ||
      (quote.nights > 0 ? quote.accommodation / quote.nights : 0),
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

  const pricing =
    (await getListingPricing(input.listingId)) ?? defaultForListing(input.listingId);
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
