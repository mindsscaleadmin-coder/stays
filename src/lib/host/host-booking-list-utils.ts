import { bookingCategoryForRecord, hostBookingCategoryLabel } from "@/lib/host/booking-category";
import { isEventOpsRecord } from "@/lib/host/host-ops-adapter";
import {
  operationalStatusForBooking,
  operationalStatusForEventRequest,
} from "@/lib/host/operational-status";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { OperationalStatus } from "@/lib/host/host-ops-types";
import { formatBookingDate } from "@/lib/mock/dashboard-data";

export function resolveBookingOperationalStatus(
  booking: HostBookingRecord
): OperationalStatus {
  if (booking.operationalStatus) return booking.operationalStatus;
  if (isEventOpsRecord(booking)) {
    return operationalStatusForEventRequest({
      status: booking.eventEnquiryStatus ?? booking.status,
      eventDate: booking.dateFlexible ? null : booking.checkIn,
      dateFlexible: Boolean(booking.dateFlexible),
    });
  }
  return operationalStatusForBooking({
    status: booking.status,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
  });
}

export function filterBookingsByOperationalStatus(
  bookings: HostBookingRecord[],
  opsStatus: OperationalStatus | ""
): HostBookingRecord[] {
  if (!opsStatus) return bookings;
  return bookings.filter((booking) => resolveBookingOperationalStatus(booking) === opsStatus);
}

export function formatNextSevenDaysMeta(booking: HostBookingRecord): string {
  const category = hostBookingCategoryLabel(bookingCategoryForRecord(booking));
  const date = formatBookingDate(booking.checkIn);
  const session = booking.experienceSessionLabel?.trim();
  const guestLabel = `${booking.guests} guest${booking.guests === 1 ? "" : "s"}`;
  const parts = [date];
  if (session) parts.push(session);
  parts.push(guestLabel, category);
  return parts.join(" · ");
}

export function formatBookingListDates(booking: HostBookingRecord): string {
  const category = bookingCategoryForRecord(booking);
  const guestLabel = `${booking.guests} guest${booking.guests === 1 ? "" : "s"}`;
  if (isEventOpsRecord(booking)) {
    const dateLabel = booking.dateFlexible
      ? "Flexible date"
      : formatBookingDate(booking.checkIn);
    return `${dateLabel} · ${guestLabel} · Enquiry`;
  }
  if (category === "experience") {
    const session = booking.experienceSessionLabel?.trim();
    if (session) {
      return `${formatBookingDate(booking.checkIn)} · ${session} · ${guestLabel}`;
    }
    return `${formatBookingDate(booking.checkIn)} · ${guestLabel}`;
  }
  return `${formatBookingDate(booking.checkIn)} → ${formatBookingDate(booking.checkOut)} · ${guestLabel}`;
}

export function formatNextSevenDaysSubmeta(booking: HostBookingRecord): string {
  const staff = booking.assignedStaffName
    ? `Assigned: ${booking.assignedStaffName}`
    : "Unassigned";
  if (booking.category === "experience") {
    return `${booking.property} · ${staff}`;
  }
  return `${booking.property} · ${formatBookingDate(booking.checkIn)} → ${formatBookingDate(booking.checkOut)} · ${staff}`;
}
