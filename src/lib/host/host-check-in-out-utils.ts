import { bookingCategoryForRecord } from "@/lib/host/booking-category";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";

/** Paid stay bookings only — experiences use mark-completed elsewhere. */
export function isStayCheckInOutBooking(booking: HostBookingRecord): boolean {
  if (booking.opsSourceType === "event_request") return false;
  return bookingCategoryForRecord(booking) === "stay";
}

export function filterStayCheckInOutBookings(
  bookings: HostBookingRecord[]
): HostBookingRecord[] {
  return bookings.filter(isStayCheckInOutBooking);
}

export function isBookingPaid(booking: HostBookingRecord): boolean {
  return booking.paymentStatus.toLowerCase() === "paid";
}

export function formatOpsTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function checkInLabel(booking: HostBookingRecord): string {
  const time = formatOpsTime(booking.checkedInAt);
  const prefix = booking.checkInSource === "auto" ? "Auto checked in" : "Checked in";
  return time ? `${prefix} ${time}` : prefix;
}

function checkOutLabel(booking: HostBookingRecord): string {
  const time = formatOpsTime(booking.checkedOutAt);
  const prefix = booking.checkOutSource === "auto" ? "Auto checked out" : "Checked out";
  return time ? `${prefix} ${time}` : prefix;
}

export function arrivalStatusLabel(booking: HostBookingRecord): {
  label: string;
  tone: "pending" | "success" | "warning" | "muted";
} {
  if (booking.noShow) {
    return { label: "No-show", tone: "warning" };
  }
  if (booking.checkInStatus === "checked_in") {
    return {
      label: checkInLabel(booking),
      tone: "success",
    };
  }
  if (booking.checkInStatus === "checked_out") {
    return { label: "Checked out", tone: "muted" };
  }
  if (!isBookingPaid(booking)) {
    return { label: "Awaiting payment", tone: "warning" };
  }
  return { label: "Awaiting check-in", tone: "pending" };
}

export function departureStatusLabel(booking: HostBookingRecord): {
  label: string;
  tone: "pending" | "success" | "muted";
} {
  if (booking.checkInStatus === "checked_out" || booking.status === "completed") {
    return {
      label: checkOutLabel(booking),
      tone: "success",
    };
  }
  return { label: "Awaiting check-out", tone: "pending" };
}

export function formatAutomationSummary(
  settings: {
    autoCheckInOutEnabled: boolean;
    checkInTime: string;
    checkOutTime: string;
    noShowCutoffTime: string;
    timezone?: string;
  },
  countryName?: string | null
): string {
  if (!settings.autoCheckInOutEnabled) {
    return "Automation off — use manual check-in / check-out below.";
  }
  const tz = settings.timezone
    ? countryName
      ? `${settings.timezone} (${countryName})`
      : settings.timezone
    : null;
  const tzPart = tz ? ` · ${tz}` : "";
  return `Guests arrive from ${settings.checkInTime} · Auto check-in ${settings.noShowCutoffTime} (mark no-show before then) · Auto check-out ${settings.checkOutTime}${tzPart}`;
}

export function countNeedsAction(
  arrivals: HostBookingRecord[],
  departures: HostBookingRecord[]
): number {
  const arrivalActions = arrivals.filter(
    (b) => !b.noShow && b.checkInStatus === "pending" && isBookingPaid(b)
  ).length;
  const departureActions = departures.filter(
    (b) => b.checkInStatus !== "checked_out" && b.status !== "completed"
  ).length;
  return arrivalActions + departureActions;
}
