import { prisma } from "@/lib/prisma";
import { BookingError } from "@/lib/booking/confirm-booking";
import { computePendingExpiresAt } from "@/lib/booking/policies";
import { stayNightDates } from "@/lib/booking/stay-night-dates";

/** Mark booking paid and block calendar dates when status is confirmed. */
export async function markBookingPaid(bookingId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BookingError("Booking not found", "NOT_FOUND");
    }
    if (booking.paymentStatus === "paid") {
      return { booking, justPaid: false };
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "paid",
        expiresAt:
          booking.status === "pending" ? computePendingExpiresAt(new Date()) : null,
      },
    });

    if (updated.status === "confirmed" && updated.checkOut) {
      const dates = stayNightDates(updated.checkIn, updated.checkOut);
      for (const date of dates) {
        await tx.availability.upsert({
          where: {
            listingId_date: { listingId: updated.listingId, date },
          },
          create: { listingId: updated.listingId, date, isBlocked: true },
          update: { isBlocked: true },
        });
      }
    }

    return { booking: updated, justPaid: true };
  });

  if (result.justPaid) {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: result.booking.listingId },
        select: { hostId: true, title: true },
      });
      if (listing) {
        const { pushHostAlert } = await import("@/lib/server/host-notifications-repo");
        await pushHostAlert(listing.hostId, {
          type: "payment",
          title: "Payment received",
          message: `Payment confirmed for ${listing.title}.`,
          href: "/host/accounts",
        });
      }
    } catch {
      // inbox write should not block payment
    }
  }

  return result.booking;
}

export { acceptBooking, declineBooking, cancelBooking, expirePendingBookings } from "./lifecycle";
