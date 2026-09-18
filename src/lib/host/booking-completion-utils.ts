import { bookingCategoryForRecord } from "@/lib/host/booking-category";
import { bookingStayHasEnded } from "@/lib/booking/stay-ended";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { todayIso } from "@/lib/host/operational-status";

export function isExperienceBooking(booking: HostBookingRecord): boolean {
  return bookingCategoryForRecord(booking) === "experience";
}

export function canHostCheckIn(
  booking: HostBookingRecord,
  timeline: "upcoming" | "ongoing" | "past" | "all"
): boolean {
  if (isExperienceBooking(booking)) return false;
  return (
    booking.status === "confirmed" &&
    booking.checkInStatus === "pending" &&
    booking.paymentStatus === "Paid" &&
    (timeline === "ongoing" || timeline === "upcoming")
  );
}

export function canHostCheckOut(booking: HostBookingRecord): boolean {
  if (isExperienceBooking(booking)) return false;
  return booking.status === "confirmed" && booking.checkInStatus === "checked_in";
}

/** Experience sessions can be marked complete once the session date has started. */
export function canHostMarkCompleted(
  booking: HostBookingRecord,
  today: string = todayIso()
): boolean {
  if (!isExperienceBooking(booking)) return false;
  if (booking.status !== "confirmed") return false;
  return booking.checkIn <= today;
}

export function canHostCancel(booking: HostBookingRecord): boolean {
  return booking.status === "confirmed" || booking.status === "pending";
}

export function showReviewRequestNudge(booking: HostBookingRecord): boolean {
  if (booking.status === "completed") return true;
  return bookingStayHasEnded({
    status: booking.status,
    checkOut: booking.checkOut,
  });
}
