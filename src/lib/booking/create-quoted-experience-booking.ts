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

  await ensureListingForBooking({
    ...input.listing,
    id: input.listingId,
    hostId: resolvedHost?.hostId ?? input.listing.hostId,
    hostName: resolvedHost?.hostName ?? input.listing.hostName,
    pricePerNight: input.listing.pricePerNight || session.price,
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

  const booking = await confirmExperienceBooking({
    listingId: input.listingId,
    guestId: input.guestId,
    dateIso: input.dateIso,
    sessionKey: input.sessionKey,
    guestCount: input.guestCount,
    totalPrice: quote.total,
    session,
  });

  return { booking, quote, session };
}
