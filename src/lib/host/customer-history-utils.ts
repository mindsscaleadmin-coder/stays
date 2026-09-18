import { operationalStatusForBooking } from "@/lib/host/operational-status";
import type {
  GuestBookingHistoryRow,
  HostGuestBookingSummary,
} from "@/lib/host/customer-history-types";

const CANCELLED = new Set(["cancelled", "declined", "expired"]);

function sortChronological(rows: GuestBookingHistoryRow[]): GuestBookingHistoryRow[] {
  return [...rows].sort((a, b) => a.bookedAt.localeCompare(b.bookedAt));
}

export function bookingNumberWithHost(
  rows: GuestBookingHistoryRow[],
  currentBookingId?: string
): number | null {
  if (!currentBookingId) return rows.length > 0 ? rows.length : null;
  const sorted = sortChronological(rows);
  const index = sorted.findIndex((row) => row.id === currentBookingId);
  return index >= 0 ? index + 1 : null;
}

export function ordinalWithHost(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function summarizeGuestBookings(
  guestId: string,
  rows: GuestBookingHistoryRow[],
  currentBookingId?: string,
  today?: string
): HostGuestBookingSummary {
  let completedBookings = 0;
  let upcomingBookings = 0;
  let cancelledBookings = 0;

  for (const row of rows) {
    const status = row.status.toLowerCase();
    if (CANCELLED.has(status)) {
      cancelledBookings += 1;
      continue;
    }
    const ops = operationalStatusForBooking(
      { status: row.status, checkIn: row.checkIn, checkOut: row.checkOut },
      today
    );
    if (ops === "completed") {
      completedBookings += 1;
    } else if (ops === "upcoming" || ops === "in_progress") {
      upcomingBookings += 1;
    }
  }

  const recentBookings = [...rows]
    .filter((row) => row.id !== currentBookingId)
    .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt))
    .slice(0, 5);

  return {
    guestId,
    totalBookings: rows.length,
    completedBookings,
    upcomingBookings,
    cancelledBookings,
    bookingNumberWithHost: bookingNumberWithHost(rows, currentBookingId),
    recentBookings,
  };
}
