import { prisma } from "@/lib/prisma";
import { BookingError } from "@/lib/booking/confirm-booking";

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

/** Mark booking paid and block calendar dates when status is confirmed. */
export async function markBookingPaid(bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BookingError("Booking not found", "NOT_FOUND");
    }
    if (booking.paymentStatus === "paid") {
      return booking;
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: "paid" },
    });

    if (updated.status === "confirmed" && updated.checkOut) {
      const dates = getDatesInRange(updated.checkIn, updated.checkOut);
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

    return updated;
  });
}

export { acceptBooking, declineBooking, cancelBooking, expirePendingBookings } from "./lifecycle";
