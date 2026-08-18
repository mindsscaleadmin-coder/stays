import { prisma } from "@/lib/prisma";
import { assertDatesAvailableForListing } from "@/lib/server/listing-availability-repo";
import { computePendingExpiresAt } from "@/lib/booking/policies";

export class BookingError extends Error {
  constructor(
    message: string,
    public code: "UNAVAILABLE" | "INVALID_DATES" | "NOT_FOUND"
  ) {
    super(message);
    this.name = "BookingError";
  }
}

function getDatesInRange(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(checkIn);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
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
}) {
  const {
    listingId,
    guestId,
    checkIn,
    checkOut,
    guestCount,
    totalPrice,
    policyId = "flexible",
  } = input;

  if (!(checkIn < checkOut)) {
    throw new BookingError("Check-out must be after check-in", "INVALID_DATES");
  }

  const dates = getDatesInRange(checkIn, checkOut);
  if (dates.length === 0) {
    throw new BookingError("Invalid date range", "INVALID_DATES");
  }

  return prisma.$transaction(async (tx) => {
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
      await assertDatesAvailableForListing(listingId, checkIn, checkOut);
    } catch {
      throw new BookingError("Selected dates are not available", "UNAVAILABLE");
    }

    let instantBook = false;
    let listingPolicy = policyId;
    try {
      const payload = JSON.parse(listing.payload) as {
        instantBook?: boolean;
        cancellationPolicyId?: string;
      };
      instantBook = Boolean(payload.instantBook);
      if (payload.cancellationPolicyId) {
        listingPolicy = payload.cancellationPolicyId;
      }
    } catch {
      instantBook = false;
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

    const overlapping = await tx.booking.findFirst({
      where: {
        listingId,
        status: { in: ["pending", "confirmed"] },
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

    const status = instantBook ? "confirmed" : "pending";
    const expiresAt = instantBook ? null : computePendingExpiresAt(new Date());

    const booking = await tx.booking.create({
      data: {
        listingId,
        guestId,
        checkIn,
        checkOut,
        guestCount,
        totalPrice,
        status,
        paymentStatus: "unpaid",
        policyId: listingPolicy,
        expiresAt,
        stripeSessionId: input.stripeSessionId ?? null,
      },
    });

    if (instantBook) {
      for (const date of dates) {
        await tx.availability.upsert({
          where: {
            listingId_date: { listingId, date },
          },
          create: { listingId, date, isBlocked: true },
          update: { isBlocked: true },
        });
      }
    }

    return booking;
  });
}
