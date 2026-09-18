import { confirmExperienceBooking } from "@/lib/booking/confirm-experience-booking";
import { computeExperienceQuote } from "@/lib/booking/compute-experience-quote";
import { ensureListingForBooking } from "@/lib/booking/ensure-listing";
import {
  normalizeExperienceSessions,
  type ExperienceSessionTemplate,
} from "@/lib/booking/experience-session-types";
import { BookingError } from "@/lib/booking/confirm-booking";
import type { QuotedBookingListing } from "@/lib/booking/create-quoted-booking";
import type { BookingQuote } from "@/lib/booking/compute-quote";
import {
  buildGuestQuoteSnapshotFromBookingQuote,
  serializeGuestQuoteSnapshot,
} from "@/lib/booking/guest-quote-snapshot";
import { LAUNCH_TAX_LABEL, LAUNCH_TAX_PCT } from "@/lib/tax/launch-market";
import { resolveListingHostForBooking } from "@/lib/server/resolve-listing-host";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { prisma } from "@/lib/prisma";

export type CreateQuotedExperienceBookingInput = {
  listingId: string;
  dateIso: string;
  sessionKey: string;
  guestCount: number;
  guestId: string;
  guestName?: string;
  guestEmail?: string;
  currency?: string;
  listing: QuotedBookingListing;
};

export async function createQuotedExperienceBooking(
  input: CreateQuotedExperienceBookingInput
): Promise<{
  booking: Awaited<ReturnType<typeof confirmExperienceBooking>>;
  quote: BookingQuote;
  session: ExperienceSessionTemplate;
}> {
  const pricing = await getListingPricing(input.listingId);
  const sessions = normalizeExperienceSessions(pricing?.sessions);
  const session = sessions.find((s) => s.key === input.sessionKey);
  if (!session) {
    throw new BookingError("Session not found for this listing", "NOT_FOUND");
  }

  const quote = computeExperienceQuote({
    session,
    guestCount: input.guestCount,
    taxPct: pricing?.taxPct,
    taxLabel: pricing?.taxLabel,
    currency: input.currency ?? pricing?.currency,
  });

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

  const guestSnapshot = serializeGuestQuoteSnapshot(
    buildGuestQuoteSnapshotFromBookingQuote(
      quote,
      pricing?.taxLabel ?? LAUNCH_TAX_LABEL,
      pricing?.taxPct ?? LAUNCH_TAX_PCT
    )
  );

  const booking = await confirmExperienceBooking({
    listingId: input.listingId,
    guestId: input.guestId,
    dateIso: input.dateIso,
    sessionKey: input.sessionKey,
    guestCount: input.guestCount,
    totalPrice: quote.total,
    session,
    guestQuoteSnapshot: guestSnapshot,
  });

  return { booking, quote, session };
}
