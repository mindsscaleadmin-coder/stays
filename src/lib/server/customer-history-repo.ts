import { prisma } from "@/lib/prisma";
import type { HostGuestBookingSummary } from "@/lib/host/customer-history-types";
import { summarizeGuestBookings } from "@/lib/host/customer-history-utils";

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getHostGuestBookingSummary(
  hostId: string,
  guestId: string,
  currentBookingId?: string
): Promise<HostGuestBookingSummary> {
  const rows = await prisma.booking.findMany({
    where: {
      guestId,
      listing: { hostId },
    },
    select: {
      id: true,
      bookingReference: true,
      status: true,
      checkIn: true,
      checkOut: true,
      createdAt: true,
      listing: { select: { title: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const history = rows.map((row) => ({
    id: row.id,
    bookingReference: row.bookingReference,
    property: row.listing.title,
    checkIn: ymd(row.checkIn),
    checkOut: row.checkOut ? ymd(row.checkOut) : ymd(row.checkIn),
    status: row.status,
    bookedAt: ymd(row.createdAt),
  }));

  return summarizeGuestBookings(guestId, history, currentBookingId);
}
