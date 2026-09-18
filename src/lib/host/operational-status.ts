import type {
  BookingOperationalInput,
  EventRequestOperationalInput,
  OperationalStatus,
} from "./host-ops-types";

const CANCELLED_BOOKING_STATUSES = new Set([
  "cancelled",
  "declined",
  "expired",
]);

const ACTIVE_BOOKING_STATUSES = new Set(["confirmed", "pending"]);

/**
 * Calendar date for comparisons (YYYY-MM-DD), aligned with host-booking-utils.
 * Pass an explicit `today` in tests for deterministic results.
 */
export function todayIso(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isCancelledBookingStatus(status: string): boolean {
  return CANCELLED_BOOKING_STATUSES.has(status.toLowerCase());
}

function isActiveBookingStatus(status: string): boolean {
  return ACTIVE_BOOKING_STATUSES.has(status.toLowerCase());
}

function isStayPast(checkOut: string, today: string): boolean {
  return checkOut < today;
}

function isStayOngoing(checkIn: string, checkOut: string, today: string): boolean {
  return checkIn <= today && checkOut >= today;
}

function isStayUpcoming(checkIn: string, today: string): boolean {
  return checkIn > today;
}

/**
 * Maps internal booking state to a single host-facing operational status.
 * Internal `Booking.status` / payment fields are never modified here.
 */
export function operationalStatusForBooking(
  input: BookingOperationalInput,
  today: string = todayIso()
): OperationalStatus {
  const status = input.status.toLowerCase();

  if (isCancelledBookingStatus(status)) {
    return "cancelled";
  }

  if (status === "completed" || input.opsCompletedAt) {
    return "completed";
  }

  if (isActiveBookingStatus(status) && isStayPast(input.checkOut, today)) {
    return "completed";
  }

  if (isActiveBookingStatus(status) && isStayOngoing(input.checkIn, input.checkOut, today)) {
    return "in_progress";
  }

  if (isActiveBookingStatus(status) && isStayUpcoming(input.checkIn, today)) {
    return "upcoming";
  }

  if (status === "confirmed" || status === "pending") {
    return "confirmed";
  }

  return "confirmed";
}

/**
 * Maps directory event enquiry state to operational status.
 * Only `available` enquiries are treated as confirmed ops work.
 */
export function operationalStatusForEventRequest(
  input: EventRequestOperationalInput,
  today: string = todayIso()
): OperationalStatus {
  const status = input.status.toLowerCase();

  if (status === "unavailable") {
    return "cancelled";
  }

  if (input.opsCompletedAt) {
    return "completed";
  }

  if (status === "available" && input.eventDate && !input.dateFlexible) {
    if (input.eventDate < today) {
      return "completed";
    }
    if (input.eventDate === today) {
      return "in_progress";
    }
    return "upcoming";
  }

  if (status === "available") {
    return "confirmed";
  }

  // pending host reply — pre-confirmation, not active ops yet
  return "confirmed";
}

export function operationalStatusLabel(status: OperationalStatus): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "upcoming":
      return "Upcoming";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
