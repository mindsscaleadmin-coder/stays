import type { Prisma } from "@prisma/client";
import { stayNightDates } from "@/lib/booking/stay-night-dates";

type Tx = Prisma.TransactionClient;

/** Reserve nights for an active booking. Unique (listingId, date) rejects double-books. */
export async function reserveBookingNights(
  tx: Tx,
  input: { listingId: string; bookingId: string; checkIn: Date; checkOut: Date }
): Promise<void> {
  const dates = stayNightDates(input.checkIn, input.checkOut);
  if (dates.length === 0) return;
  await tx.bookingNight.createMany({
    data: dates.map((date) => ({
      listingId: input.listingId,
      bookingId: input.bookingId,
      date,
    })),
  });
}

/** Free nights when a booking is cancelled, declined, or expired. */
export async function releaseBookingNights(tx: Tx, bookingId: string): Promise<void> {
  await tx.bookingNight.deleteMany({ where: { bookingId } });
}

/** Return experience slot spots when a session booking is cancelled/declined/expired. */
export async function releaseExperienceSlotCapacity(
  tx: Tx,
  booking: { experienceSlotId: string | null; guestCount: number }
): Promise<void> {
  if (!booking.experienceSlotId || booking.guestCount <= 0) return;
  const slot = await tx.experienceSlot.findUnique({
    where: { id: booking.experienceSlotId },
  });
  if (!slot) return;
  const nextCount = Math.max(0, slot.bookedCount - booking.guestCount);
  await tx.experienceSlot.update({
    where: { id: slot.id },
    data: { bookedCount: nextCount },
  });
}
