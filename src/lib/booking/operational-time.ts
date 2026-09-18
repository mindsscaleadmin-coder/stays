import type { OperationalSettings } from "@/lib/host/operational-settings-types";

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Calendar date YYYY-MM-DD in the given IANA timezone. */
export function dateIsoInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Minutes since midnight in the given timezone. */
export function minutesInTimezone(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function hasReachedOperationalTime(
  now: Date,
  time: string,
  timezone: string
): boolean {
  return minutesInTimezone(now, timezone) >= parseTimeToMinutes(time);
}

export function isBeforeOperationalTime(
  now: Date,
  time: string,
  timezone: string
): boolean {
  return minutesInTimezone(now, timezone) < parseTimeToMinutes(time);
}

export function bookingDateIso(bookingDate: Date): string {
  const y = bookingDate.getUTCFullYear();
  const m = String(bookingDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bookingDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isArrivalDay(
  checkIn: Date,
  now: Date,
  settings: OperationalSettings
): boolean {
  return dateIsoInTimezone(now, settings.timezone) === bookingDateIso(checkIn);
}

export function isDepartureDay(
  checkOut: Date,
  now: Date,
  settings: OperationalSettings
): boolean {
  return dateIsoInTimezone(now, settings.timezone) === bookingDateIso(checkOut);
}

/**
 * Auto check-in runs at the no-show cutoff (default 5 PM).
 * Hosts can mark no-show any time before then; everyone else is checked in at once.
 */
export function canAutoCheckInNow(
  now: Date,
  settings: OperationalSettings
): boolean {
  const autoTime = settings.noShowCutoffTime || settings.checkInTime;
  return hasReachedOperationalTime(now, autoTime, settings.timezone);
}

export function canAutoCheckOutNow(
  now: Date,
  settings: OperationalSettings
): boolean {
  return hasReachedOperationalTime(now, settings.checkOutTime, settings.timezone);
}
