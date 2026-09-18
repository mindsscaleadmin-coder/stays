import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CANCELLATION_POLICY_ID } from "@/lib/booking/policies";
import { BookingError } from "@/lib/booking/confirm-booking";
import { createBookingReference } from "@/lib/booking/booking-reference";
import { ensureExperienceSlot } from "@/lib/booking/experience-slots";
import { experienceSlotDate } from "@/lib/booking/experience-slot-date";
import {
  normalizeExperienceSessions,
  type ExperienceSessionTemplate,
} from "@/lib/booking/experience-session-types";
import { isExperienceListing } from "@/lib/booking/is-experience-listing";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";

/**
 * Instant-confirm experience booking against a capacity slot (not night ranges).
 * Concurrency: Listing FOR UPDATE + ExperienceSlot row FOR UPDATE + capacity check.
 */
export async function confirmExperienceBooking(input: {
  listingId: string;
  guestId: string;
  dateIso: string;
  sessionKey: string;
  guestCount: number;
  totalPrice: number;
  policyId?: string;
  stripeSessionId?: string | null;
  guestQuoteSnapshot?: string | null;
  /** Optional preloaded session (tests); otherwise loaded from listing pricing. */
  session?: ExperienceSessionTemplate;
}) {
  const {
    listingId,
    guestId,
    dateIso,
    sessionKey,
    guestCount,
    totalPrice,
    policyId = DEFAULT_CANCELLATION_POLICY_ID,
  } = input;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new BookingError("Invalid experience date", "INVALID_DATES");
  }
  const todayIso = new Date().toISOString().slice(0, 10);
  if (dateIso < todayIso) {
    throw new BookingError("Experience date cannot be in the past", "INVALID_DATES");
  }
  if (guestCount < 1 || guestCount > 50) {
    throw new BookingError("Invalid guest count", "INVALID_DATES");
  }

  let session = input.session;
  if (!session) {
    const pricing = await getListingPricing(listingId);
    const sessions = normalizeExperienceSessions(pricing?.sessions);
    session = sessions.find((s) => s.key === sessionKey);
  }
  if (!session) {
    throw new BookingError("Session not found for this listing", "NOT_FOUND");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new BookingError("Listing not found or not available", "NOT_FOUND");
      }

      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      if (!listing || listing.status !== "approved") {
        throw new BookingError("Listing not found or not available", "NOT_FOUND");
      }

      let payloadType = "";
      try {
        const payload = JSON.parse(listing.payload) as { type?: string };
        payloadType = payload.type ?? "";
      } catch {
        // ignore
      }
      if (
        !isExperienceListing({
          parentCategory: listing.parentCategory,
          type: payloadType,
        })
      ) {
        throw new BookingError("Listing is not an experience", "INVALID_DATES");
      }

      if (guestCount > session!.capacity) {
        throw new BookingError("Guest count exceeds session capacity", "INVALID_DATES");
      }
      if (listing.maxGuests > 0 && guestCount > listing.maxGuests) {
        throw new BookingError("Guest count exceeds maximum", "INVALID_DATES");
      }

      const slot = await ensureExperienceSlot(tx, {
        listingId,
        dateIso,
        session: session!,
      });

      const slotLocked = await tx.$queryRaw<{ id: string; capacity: number; bookedCount: number }[]>`
        SELECT id, capacity, "bookedCount" FROM "ExperienceSlot"
        WHERE id = ${slot.id} FOR UPDATE
      `;
      const current = slotLocked[0];
      if (!current) {
        throw new BookingError("Session slot not available", "UNAVAILABLE");
      }
      if (current.bookedCount + guestCount > current.capacity) {
        throw new BookingError("Not enough spots left in this session", "UNAVAILABLE");
      }

      let listingPolicy = policyId;
      let hostName = "Host";
      try {
        const payload = JSON.parse(listing.payload) as {
          cancellationPolicyId?: string;
          hostName?: string;
        };
        if (payload.cancellationPolicyId) listingPolicy = payload.cancellationPolicyId;
        if (payload.hostName?.trim()) hostName = payload.hostName.trim();
      } catch {
        // defaults
      }

      const guest = await tx.user.findUnique({ where: { id: guestId } });
      if (!guest) {
        await tx.user.create({
          data: {
            id: guestId,
            fullName: "Guest",
            email: `${guestId}@guests.local`,
            roles: JSON.stringify(["guest"]),
          },
        });
      }

      const checkIn = experienceSlotDate(dateIso);

      const booking = await tx.booking.create({
        data: {
          bookingReference: createBookingReference(),
          listingId,
          guestId,
          checkIn,
          checkOut: null,
          guestCount,
          totalPrice,
          status: "confirmed",
          paymentStatus: "unpaid",
          policyId: listingPolicy,
          expiresAt: null,
          stripeSessionId: input.stripeSessionId ?? null,
          guestQuoteSnapshot: input.guestQuoteSnapshot ?? null,
          experienceSlotId: current.id,
        },
      });

      await tx.experienceSlot.update({
        where: { id: current.id },
        data: { bookedCount: { increment: guestCount } },
      });

      await tx.bookingMessage.create({
        data: {
          bookingId: booking.id,
          senderRole: "host",
          senderId: listing.hostId,
          senderName: hostName,
          body: `Thanks for booking ${listing.title}. Message us here about meeting point, timing, or anything you need for your experience.`,
        },
      });

      return { booking, hostId: listing.hostId, listingTitle: listing.title };
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );

  const guest = await prisma.user.findUnique({ where: { id: result.booking.guestId } });
  try {
    const { pushHostAlert } = await import("@/lib/server/host-notifications-repo");
    await pushHostAlert(result.hostId, {
      type: "booking",
      title: "New experience booking",
      message: `${result.booking.bookingReference} · ${guest?.fullName || "A guest"} · ${result.listingTitle} · ${dateIso} · ${session.label}`,
      href: `/host/bookings/${result.booking.id}`,
    });
  } catch {
    // inbox write should not block checkout
  }

  return result.booking;
}
