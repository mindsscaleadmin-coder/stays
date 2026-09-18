import { bookingCategoryForRecord, type HostBookingCategory } from "@/lib/host/booking-category";
import {
  filterBookingsByTab,
  getBookingTimeline,
  todayIso,
} from "@/lib/host/host-booking-utils";
import type { HostBookingRecord, BookingTimelineTab } from "@/lib/host/host-booking-types";
import { resolveBookingOperationalStatus } from "@/lib/host/host-booking-list-utils";
import type { OperationalStatus } from "@/lib/host/host-ops-types";

export type CrmCategoryFilter = HostBookingCategory | "all";

export interface CrmBookingStats {
  total: number;
  today: number;
  upcoming: number;
  ongoing: number;
  needsAttention: number;
  unassigned: number;
}

export interface CrmBookingFilters {
  tab: BookingTimelineTab;
  category: CrmCategoryFilter;
  query: string;
  fromDate: string;
  toDate: string;
  status: string;
  opsStatus: OperationalStatus | "";
}

export function bookingNeedsAttention(booking: HostBookingRecord, today: string = todayIso()): boolean {
  const timeline = getBookingTimeline(booking, today);
  const opsStatus = resolveBookingOperationalStatus(booking);

  if (booking.disputeStatus === "open") return true;
  if (booking.noShow) return true;

  if (timeline === "ongoing" && booking.checkInStatus === "pending") return true;

  if (
    (timeline === "upcoming" || timeline === "ongoing" || opsStatus === "in_progress") &&
    !booking.assignedStaffName
  ) {
    return true;
  }

  if (
    (timeline === "upcoming" || timeline === "ongoing") &&
    (booking.specialRequests?.trim() || booking.dietaryNeeds?.trim())
  ) {
    return true;
  }

  return false;
}

export function computeCrmBookingStats(
  bookings: HostBookingRecord[],
  today: string = todayIso()
): CrmBookingStats {
  let todayCount = 0;
  let upcoming = 0;
  let ongoing = 0;
  let needsAttention = 0;
  let unassigned = 0;

  for (const booking of bookings) {
    const timeline = getBookingTimeline(booking, today);
    const opsStatus = resolveBookingOperationalStatus(booking);

    if (timeline === "upcoming") upcoming += 1;
    if (timeline === "ongoing") ongoing += 1;

    const isToday =
      booking.checkIn === today ||
      booking.checkOut === today ||
      (booking.checkIn <= today && booking.checkOut >= today);
    if (isToday && opsStatus !== "cancelled") todayCount += 1;

    if (!booking.assignedStaffName && opsStatus !== "cancelled" && opsStatus !== "completed") {
      unassigned += 1;
    }

    if (bookingNeedsAttention(booking, today)) needsAttention += 1;
  }

  return {
    total: bookings.length,
    today: todayCount,
    upcoming,
    ongoing,
    needsAttention,
    unassigned,
  };
}

export function filterBookingsByCategory(
  bookings: HostBookingRecord[],
  category: CrmCategoryFilter
): HostBookingRecord[] {
  if (category === "all") return bookings;
  return bookings.filter((booking) => bookingCategoryForRecord(booking) === category);
}

export function filterBookingsByQuery(
  bookings: HostBookingRecord[],
  query: string
): HostBookingRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return bookings;

  return bookings.filter((booking) => {
    const haystack = [
      booking.guest,
      booking.property,
      booking.bookingReference,
      booking.id,
      booking.assignedStaffName,
      booking.specialRequests,
      booking.dietaryNeeds,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

function bookingInDateRange(
  booking: { checkIn: string; checkOut: string },
  from: string,
  to: string
): boolean {
  if (from && booking.checkOut < from) return false;
  if (to && booking.checkIn > to) return false;
  return true;
}

export function applyCrmBookingFilters(
  bookings: HostBookingRecord[],
  filters: CrmBookingFilters,
  today: string = todayIso()
): HostBookingRecord[] {
  let list = filterBookingsByTab(bookings, filters.tab, today);
  list = filterBookingsByCategory(list, filters.category);
  list = filterBookingsByQuery(list, filters.query);

  if (filters.status) {
    list = list.filter((booking) => booking.status === filters.status);
  }

  if (filters.opsStatus) {
    list = list.filter(
      (booking) => resolveBookingOperationalStatus(booking) === filters.opsStatus
    );
  }

  if (filters.fromDate || filters.toDate) {
    list = list.filter((booking) =>
      bookingInDateRange(booking, filters.fromDate, filters.toDate)
    );
  }

  return list;
}

export function guestInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function attentionReason(booking: HostBookingRecord, today: string = todayIso()): string | null {
  const timeline = getBookingTimeline(booking, today);

  if (booking.disputeStatus === "open") return "Open dispute";
  if (booking.noShow) return "No-show flagged";
  if (timeline === "ongoing" && booking.checkInStatus === "pending") return "Check-in pending";
  if (!booking.assignedStaffName && timeline !== "past") return "No staff assigned";
  if (booking.dietaryNeeds?.trim()) return "Dietary needs noted";
  if (booking.specialRequests?.trim()) return "Special requests";
  return null;
}
