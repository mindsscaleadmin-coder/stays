import type { SeasonalPeriod } from "./host-availability-types";

/** Month/day comparison for recurring yearly seasonal windows */
function md(iso: string): number {
  const [, m, d] = iso.split("-").map(Number);
  return m * 100 + d;
}

export function isDateInSeasonalPeriod(date: string, period: SeasonalPeriod): boolean {
  const target = md(date.slice(5)); // MM-DD from YYYY-MM-DD
  const start = md(period.startDate.slice(5));
  const end = md(period.endDate.slice(5));

  if (start <= end) {
    return target >= start && target <= end;
  }
  // spans year boundary (e.g. Dec → Feb)
  return target >= start || target <= end;
}

export function getSeasonalPeriodForDate(
  date: string,
  periods: SeasonalPeriod[]
): SeasonalPeriod | undefined {
  return periods.find((p) => isDateInSeasonalPeriod(date, p));
}

export function isSeasonallyClosed(date: string, periods: SeasonalPeriod[]): boolean {
  const period = getSeasonalPeriodForDate(date, periods);
  return period?.closed === true;
}

/** Manual block, inbound calendar, or seasonal closure — guests cannot book this night. */
export function isDateUnavailable(
  date: string,
  settings: {
    blockedDates: string[];
    icalImportedDates?: string[];
    seasonalPeriods: SeasonalPeriod[];
  }
): boolean {
  if (settings.blockedDates.includes(date)) return true;
  if (settings.icalImportedDates?.includes(date)) return true;
  return isSeasonallyClosed(date, settings.seasonalPeriods);
}

/** Whole nights between check-in and check-out (YYYY-MM-DD). */
export function countStayNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn.slice(0, 10)}T12:00:00`);
  const end = new Date(`${checkOut.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

/** Earliest check-in allowed by advance-notice rule (local calendar date). */
export function earliestBookableCheckInIso(advanceNoticeDays: number, from = new Date()): string {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, advanceNoticeDays));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Host booking rules (min stay + advance notice). Returns null when OK,
 * or a short guest-facing reason when the stay breaks a rule.
 */
export function bookingRulesViolation(
  checkIn: string,
  checkOut: string,
  settings: { minStayNights: number; advanceNoticeDays: number },
  now = new Date()
): string | null {
  const inIso = checkIn.slice(0, 10);
  const outIso = checkOut.slice(0, 10);
  const nights = countStayNights(inIso, outIso);
  const minStay = Math.max(1, settings.minStayNights || 1);
  if (nights < minStay) {
    return `Minimum stay is ${minStay} night${minStay === 1 ? "" : "s"}`;
  }
  const earliest = earliestBookableCheckInIso(settings.advanceNoticeDays || 0, now);
  if (inIso < earliest) {
    const days = Math.max(0, settings.advanceNoticeDays || 0);
    return days === 0
      ? "Check-in date is in the past"
      : `Book at least ${days} day${days === 1 ? "" : "s"} before check-in`;
  }
  return null;
}

/** Upcoming seasonally closed nights for outbound iCal. */
export function expandSeasonalClosedDates(
  periods: SeasonalPeriod[],
  monthsAhead = 18
): string[] {
  if (periods.length === 0) return [];
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(cursor);
  end.setMonth(end.getMonth() + monthsAhead);
  while (cursor < end) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (isSeasonallyClosed(iso, periods)) dates.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function calendarMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function daysInMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay(); // 0 = Sun
  const days: (string | null)[] = [];

  for (let i = 0; i < startPad; i++) days.push(null);

  for (let d = 1; d <= last.getDate(); d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push(iso);
  }

  return days;
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
