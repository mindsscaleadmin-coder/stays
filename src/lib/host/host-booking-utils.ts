import type { HostBookingRecord, BookingTimelineTab } from "./host-booking-types";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getBookingTimeline(
  booking: HostBookingRecord,
  today: string = todayIso()
): BookingTimelineTab | "past" {
  if (booking.status === "pending") return "requests";
  if (
    booking.status === "declined" ||
    booking.status === "cancelled" ||
    booking.status === "completed" ||
    booking.status === "expired"
  ) {
    return "past";
  }
  if (booking.status === "confirmed") {
    if (booking.checkIn <= today && booking.checkOut >= today) return "ongoing";
    if (booking.checkIn > today) return "upcoming";
    return "past";
  }
  return "past";
}

export function filterBookingsByTab(
  bookings: HostBookingRecord[],
  tab: BookingTimelineTab,
  today: string = todayIso()
): HostBookingRecord[] {
  if (tab === "all") return bookings;
  return bookings.filter((b) => getBookingTimeline(b, today) === tab);
}

export function defaultCheckInStatus(
  status: HostBookingRecord["status"]
): HostBookingRecord["checkInStatus"] {
  if (status === "completed") return "checked_out";
  return "pending";
}

export function defaultRefundStatus(
  status: HostBookingRecord["status"]
): HostBookingRecord["refundStatus"] {
  if (status === "cancelled") return "full";
  return "none";
}

export function displaySpecialRequests(booking: HostBookingRecord): string {
  return booking.specialRequests?.trim() || booking.guestNotes?.trim() || "";
}

export function timelineTabLabel(tab: BookingTimelineTab): string {
  switch (tab) {
    case "requests":
      return "Requests";
    case "upcoming":
      return "Upcoming";
    case "ongoing":
      return "Ongoing";
    case "past":
      return "Past";
    default:
      return "All";
  }
}
