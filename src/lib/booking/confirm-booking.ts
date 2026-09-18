import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CANCELLATION_POLICY_ID } from "@/lib/booking/policies";
import { assertDatesAvailableForListing } from "@/lib/server/listing-availability-repo";
import { createBookingReference } from "@/lib/booking/booking-reference";
import { stayNightDates } from "@/lib/booking/stay-night-dates";
import { reserveBookingNights } from "@/lib/booking/booking-nights";

/**
 * Platform policy: every booking confirms immediately once the calendar shows it
 * available — no host approval step. Hosts control availability by hiding/
 * unpublishing a listing or blocking specific dates from their dashboard, not by
 * approving or declining individual booking requests.
 *
 * Concurrency: Listing FOR UPDATE serializes confirmers; BookingNight
 * @@unique([listingId, date]) is the durable DB guard if anything races past the lock.
 */
const BOOKINGS_ALWAYS_INSTANT_CONFIRM = true;

export class BookingError extends Error {
  constructor(
    message: string,
    public code: "UNAVAILABLE" | "INVALID_DATES" | "NOT_FOUND"
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export async function confirmBooking(input: {
  listingId: string;
  guestId: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  totalPrice: number;
  policyId?: string;
  stripeSessionId?: string | null;
  guestQuoteSnapshot?: string | null;
}) {
  const {
    listingId,
    guestId,
    checkIn,
    checkOut,
    guestCount,
    totalPrice,
    policyId = DEFAULT_CANCELLATION_POLICY_ID,
  } = input;

  if (!(checkIn < checkOut)) {
    throw new BookingError("Check-out must be after check-in", "INVALID_DATES");
  }

  const dates = stayNightDates(checkIn, checkOut);
  if (dates.length === 0) {
    throw new BookingError("Invalid date range", "INVALID_DATES");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // Serialize bookings for this listing so two checkouts cannot both pass the overlap check.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new BookingError("Listing not found or not available", "NOT_FOUND");
      }

      const listing = await tx.listing.findUnique({
        where: { id: listingId },
      });

      if (!listing || listing.status !== "approved") {
        throw new BookingError("Listing not found or not available", "NOT_FOUND");
      }

      if (guestCount > listing.maxGuests) {
        throw new BookingError("Guest count exceeds maximum", "INVALID_DATES");
      }

      try {
        await assertDatesAvailableForListing(listingId, checkIn, checkOut, tx);
      } catch (error) {
        const message =
          error instanceof Error && error.message && error.message !== "UNAVAILABLE"
            ? error.message
            : "Selected dates are not available";
        throw new BookingError(message, "UNAVAILABLE");
      }

      const instantBook = BOOKINGS_ALWAYS_INSTANT_CONFIRM;
      let listingPolicy = policyId;
      let hostName = "Host";
      try {
        const payload = JSON.parse(listing.payload) as {
          cancellationPolicyId?: string;
          hostName?: string;
        };
        if (payload.cancellationPolicyId) {
          listingPolicy = payload.cancellationPolicyId;
        }
        if (payload.hostName?.trim()) hostName = payload.hostName.trim();
      } catch {
        // fall back to defaults above
      }

      const blocked = await tx.availability.findMany({
        where: {
          listingId,
          date: { in: dates },
          isBlocked: true,
        },
      });

      if (blocked.length > 0) {
        throw new BookingError("Selected dates are not available", "UNAVAILABLE");
      }

      // Fast fail on occupancy nights (unique insert below is the hard guarantee).
      const nightTaken = await tx.bookingNight.findFirst({
        where: { listingId, date: { in: dates } },
        select: { id: true },
      });
      if (nightTaken) {
        throw new BookingError("Selected dates overlap an existing booking", "UNAVAILABLE");
      }

      const overlapping = await tx.booking.findFirst({
        where: {
          listingId,
          status: { in: ["pending", "confirmed"] },
          // Experience bookings use checkOut=null + experienceSlotId; they must not
          // poison night-range overlap checks for stays on the same listing.
          experienceSlotId: null,
          checkIn: { lt: checkOut },
          OR: [{ checkOut: { gt: checkIn } }, { checkOut: null }],
        },
      });

      if (overlapping) {
        throw new BookingError("Selected dates overlap an existing booking", "UNAVAILABLE");
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

      const booking = await tx.booking.create({
        data: {
          bookingReference: createBookingReference(),
          listingId,
          guestId,
          checkIn,
          checkOut,
          guestCount,
          totalPrice,
          status: "confirmed",
          paymentStatus: "unpaid",
          policyId: listingPolicy,
          expiresAt: null,
          stripeSessionId: input.stripeSessionId ?? null,
          guestQuoteSnapshot: input.guestQuoteSnapshot ?? null,
        },
      });

      // DB-level guard: unique (listingId, date) rejects a concurrent double-book even if the
      // overlap SELECT raced — same pattern as Availability blocked dates.
      try {
        await reserveBookingNights(tx, {
          listingId,
          bookingId: booking.id,
          checkIn,
          checkOut,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new BookingError("Selected dates overlap an existing booking", "UNAVAILABLE");
        }
        throw error;
      }

      await tx.bookingMessage.create({
        data: {
          bookingId: booking.id,
          senderRole: "host",
          senderId: listing.hostId,
          senderName: hostName,
          body: `Thanks for booking ${listing.title}. Message us here about check-in, directions, or anything you need for your stay.`,
        },
      });

      return { booking, hostId: listing.hostId, listingTitle: listing.title, instantBook };
    },
    {
      // Concurrent checkouts wait on FOR UPDATE; give the second enough time to fail cleanly.
      maxWait: 10_000,
      timeout: 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );

  const guest = await prisma.user.findUnique({ where: { id: result.booking.guestId } });
  const checkInIso = result.booking.checkIn.toISOString().slice(0, 10);
  const checkOutIso = result.booking.checkOut?.toISOString().slice(0, 10) ?? "";
  try {
    const { pushHostAlert } = await import("@/lib/server/host-notifications-repo");
    await pushHostAlert(result.hostId, {
      type: "booking",
      title: "New booking confirmed",
      message: `${result.booking.bookingReference} · ${guest?.fullName || "A guest"} · ${result.listingTitle} · ${checkInIso} → ${checkOutIso}`,
      href: `/host/bookings/${result.booking.id}`,
    });
  } catch {
    // inbox write should not block checkout
  }

  return result.booking;
}
