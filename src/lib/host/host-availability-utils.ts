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

/** Manual block or seasonal closure — guests cannot book this night. */
export function isDateUnavailable(
  date: string,
  settings: { blockedDates: string[]; seasonalPeriods: SeasonalPeriod[] }
): boolean {
  if (settings.blockedDates.includes(date)) return true;
  return isSeasonallyClosed(date, settings.seasonalPeriods);
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
