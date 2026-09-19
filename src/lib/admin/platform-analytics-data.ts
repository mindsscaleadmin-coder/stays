import { computeHostBookingMetrics, resolveBookingHost } from "@/lib/admin/booking-oversight-utils";
import { resolveAdminHosts } from "@/lib/admin/host-helpers";
import { loadAllUsers, USERS_SYNC_EVENT } from "@/lib/admin/user-data";
import type { AdminUserRecord } from "@/lib/admin/user-types";
import {
  DISPLAY_DEFAULT_CURRENCY,
  currencyForCountryName,
  locationMatchesCountry,
} from "@/lib/currency";
import { HOST_BOOKINGS_SYNC_EVENT, loadHostBookings } from "@/lib/host/host-booking-data";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { loadHostReviews } from "@/lib/host/host-reviews-data";
import { LISTINGS_SYNC_EVENT, loadAllSubmissions } from "@/lib/listings/submission-data";
import type { SubmittedListing } from "@/lib/listings/submission-types";
import type {
  BookingStatusSlice,
  ChurnMetrics,
  HostPerformanceRow,
  MonthlyTrendPoint,
  PlatformAnalyticsSnapshot,
  PlatformKpis,
  RegionalPerformanceRow,
} from "./platform-analytics-types";

export type PlatformAnalyticsOptions = {
  /** Filter all metrics to this country name (taxonomy / listing country). Empty = all. */
  country?: string;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const INACTIVE_DAYS = 90;
const CHURN_DAYS = 180;
const ACTIVE_HOST_DAYS = 60;

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500",
  pending: "bg-amber-500",
  cancelled: "bg-red-400",
  completed: "bg-blue-500",
};

export function parseBookingAmount(value: string | undefined): number {
  if (!value) return 0;
  const digits = value.replace(/[^\d.]/g, "");
  const n = Number.parseFloat(digits);
  return Number.isFinite(n) ? n : 0;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function buildListingMaps(listings: SubmittedListing[]) {
  const byTitle = new Map<string, SubmittedListing>();
  const byId = new Map<string, SubmittedListing>();
  for (const listing of listings) {
    byTitle.set(listing.title.toLowerCase(), listing);
    byId.set(listing.id, listing);
  }
  return { byTitle, byId };
}

function resolveListingForBooking(
  booking: HostBookingRecord,
  maps: ReturnType<typeof buildListingMaps>
): SubmittedListing | undefined {
  if (booking.listingId) return maps.byId.get(booking.listingId);
  return maps.byTitle.get(booking.property.toLowerCase());
}

function isRevenueBooking(booking: HostBookingRecord): boolean {
  return booking.status !== "cancelled";
}

function lastMonths(count: number): { key: string; label: string; start: Date; end: Date }[] {
  const result: { key: string; label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    result.push({
      key: monthKey(start),
      label: MONTH_LABELS[start.getMonth()],
      start,
      end,
    });
  }
  return result;
}

function inRange(date: Date | null, start: Date, end: Date): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

function computeMonthlyTrends(
  bookings: HostBookingRecord[],
  hosts: AdminUserRecord[],
  listings: SubmittedListing[]
): MonthlyTrendPoint[] {
  const months = lastMonths(6);
  return months.map(({ key, label, start, end }) => {
    const monthBookings = bookings.filter((b) => inRange(parseDate(b.bookedAt), start, end));
    const revenue = monthBookings
      .filter(isRevenueBooking)
      .reduce((sum, b) => sum + parseBookingAmount(b.total), 0);
    const newHosts = hosts.filter((h) => {
      if (!h.roles.includes("host")) return false;
      const joined = parseDate(h.joinedAt);
      return inRange(joined, start, end);
    }).length;
    const newListings = listings.filter((l) => inRange(parseDate(l.submittedAt), start, end)).length;
    return {
      month: key,
      label,
      bookings: monthBookings.length,
      revenue,
      newHosts,
      newListings,
    };
  });
}

function computeRegional(
  bookings: HostBookingRecord[],
  listings: SubmittedListing[],
  groupBy: "state" | "district"
): RegionalPerformanceRow[] {
  const maps = buildListingMaps(listings);
  const rows = new Map<string, RegionalPerformanceRow>();

  for (const listing of listings.filter((l) => l.status === "approved")) {
    const key = groupBy === "state" ? listing.state : `${listing.state}|${listing.district}`;
    const row =
      rows.get(key) ??
      ({
        state: listing.state,
        district: listing.district,
        bookings: 0,
        revenue: 0,
        listings: 0,
        sharePct: 0,
      } satisfies RegionalPerformanceRow);
    row.listings += 1;
    rows.set(key, row);
  }

  for (const booking of bookings.map(resolveBookingHost)) {
    const listing = resolveListingForBooking(booking, maps);
    const state = listing?.state ?? booking.propertyLocation.split(",").pop()?.trim() ?? "Unknown";
    const district = listing?.district ?? booking.propertyLocation.split(",")[0]?.trim() ?? "Unknown";
    const key = groupBy === "state" ? state : `${state}|${district}`;
    const row =
      rows.get(key) ??
      ({
        state,
        district,
        bookings: 0,
        revenue: 0,
        listings: 0,
        sharePct: 0,
      } satisfies RegionalPerformanceRow);
    row.bookings += 1;
    if (isRevenueBooking(booking)) row.revenue += parseBookingAmount(booking.total);
    rows.set(key, row);
  }

  const totalRevenue = Array.from(rows.values()).reduce((s, r) => s + r.revenue, 0) || 1;
  return Array.from(rows.values())
    .map((r) => ({ ...r, sharePct: Math.round((r.revenue / totalRevenue) * 1000) / 10 }))
    .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings);
}

function avgRatingForHost(hostId: string): number {
  const data = loadHostReviews(hostId);
  const visible = data.reviews.filter((r) => r.moderationStatus !== "removed");
  if (visible.length === 0) return data.overallRating;
  const sum = visible.reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / visible.length) * 10) / 10;
}

function computeHostPerformance(
  bookings: HostBookingRecord[],
  listings: SubmittedListing[],
  hosts: AdminUserRecord[]
): { top: HostPerformanceRow[]; under: HostPerformanceRow[] } {
  const metrics = computeHostBookingMetrics(bookings);
  const hostListingCounts = new Map<string, number>();
  for (const listing of listings.filter((l) => l.status === "approved")) {
    hostListingCounts.set(listing.hostId, (hostListingCounts.get(listing.hostId) ?? 0) + 1);
  }

  const revenueByHost = new Map<string, number>();
  for (const booking of bookings.map(resolveBookingHost)) {
    if (!isRevenueBooking(booking)) continue;
    const hostId = booking.hostId ?? "unknown";
    revenueByHost.set(hostId, (revenueByHost.get(hostId) ?? 0) + parseBookingAmount(booking.total));
  }

  const allHostIds = new Set<string>();
  for (const h of hosts.filter((u) => u.roles.includes("host"))) allHostIds.add(h.id);
  for (const m of metrics) allHostIds.add(m.hostId);
  for (const l of listings) allHostIds.add(l.hostId);

  const rows: HostPerformanceRow[] = Array.from(allHostIds).map((hostId) => {
    const metric = metrics.find((m) => m.hostId === hostId);
    const host = hosts.find((h) => h.id === hostId);
    const hostName =
      metric?.hostName ??
      host?.name ??
      listings.find((l) => l.hostId === hostId)?.hostName ??
      hostId;
    const revenue = revenueByHost.get(hostId) ?? 0;
    const bookingCount = metric?.totalBookings ?? 0;
    const cancellationRate = metric?.cancellationRate ?? 0;
    const activeListings = hostListingCounts.get(hostId) ?? 0;
    const avgRating = avgRatingForHost(hostId);

    let tier: HostPerformanceRow["tier"] = "average";
    if (
      revenue >= 15000 ||
      (bookingCount >= 4 && cancellationRate < 10 && avgRating >= 4.5)
    ) {
      tier = "top";
    } else if (
      cancellationRate >= 20 ||
      (activeListings > 0 && bookingCount === 0) ||
      avgRating < 3.5
    ) {
      tier = "underperforming";
    }

    return {
      hostId,
      hostName,
      bookings: bookingCount,
      revenue,
      avgRating,
      cancellationRate,
      activeListings,
      tier,
    };
  });

  const top = rows
    .filter((r) => r.tier === "top")
    .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
    .slice(0, 8);
  const under = rows
    .filter((r) => r.tier === "underperforming")
    .sort((a, b) => a.revenue - b.revenue || b.cancellationRate - a.cancellationRate)
    .slice(0, 8);

  return { top, under };
}

function computeChurn(
  bookings: HostBookingRecord[],
  hosts: AdminUserRecord[],
  listings: SubmittedListing[]
): ChurnMetrics {
  const hostUsers = resolveAdminHosts(hosts, listings);
  const inactiveCutoff = daysAgo(INACTIVE_DAYS);
  const churnCutoff = daysAgo(CHURN_DAYS);

  const lastBookingByHost = new Map<string, Date>();
  for (const booking of bookings.map(resolveBookingHost)) {
    const hostId = booking.hostId;
    if (!hostId) continue;
    const booked = parseDate(booking.bookedAt);
    if (!booked) continue;
    const prev = lastBookingByHost.get(hostId);
    if (!prev || booked > prev) lastBookingByHost.set(hostId, booked);
  }

  const inactiveHostRows: ChurnMetrics["inactiveHostRows"] = [];
  let inactiveHosts = 0;
  let churnedHosts = 0;

  for (const host of hostUsers) {
    const lastBooking = lastBookingByHost.get(host.id);
    const joined = parseDate(host.joinedAt);
    const hasListing = listings.some((l) => l.hostId === host.id && l.status === "approved");

    if (host.status === "suspended" || host.status === "banned") {
      churnedHosts += 1;
      inactiveHostRows.push({
        hostId: host.id,
        hostName: host.name,
        reason: `Account ${host.status}`,
      });
      continue;
    }

    const lastActivity = lastBooking ?? joined;
    if (lastActivity && lastActivity < churnCutoff && hasListing) {
      churnedHosts += 1;
      inactiveHostRows.push({
        hostId: host.id,
        hostName: host.name,
        lastActivityAt: lastActivity.toISOString(),
        reason: "No bookings in 180+ days",
      });
    } else if (
      lastActivity &&
      lastActivity < inactiveCutoff &&
      (hasListing || (joined && joined < inactiveCutoff))
    ) {
      inactiveHosts += 1;
      inactiveHostRows.push({
        hostId: host.id,
        hostName: host.name,
        lastActivityAt: lastActivity.toISOString(),
        reason: "Inactive 90+ days",
      });
    }
  }

  const totalHosts = hostUsers.length || 1;
  const churnRatePct = Math.round((churnedHosts / totalHosts) * 1000) / 10;

  const trends = computeMonthlyTrends(bookings, hosts, listings);
  const thisMonth = trends[trends.length - 1];
  const lastMonth = trends[trends.length - 2] ?? thisMonth;

  return {
    inactiveHosts,
    churnedHosts,
    churnRatePct,
    hostGrowthPct: pctChange(thisMonth.newHosts, lastMonth.newHosts),
    listingGrowthPct: pctChange(thisMonth.newListings, lastMonth.newListings),
    inactiveHostRows: inactiveHostRows.slice(0, 10),
  };
}

function computeKpis(
  bookings: HostBookingRecord[],
  listings: SubmittedListing[],
  hosts: AdminUserRecord[],
  trends: MonthlyTrendPoint[]
): PlatformKpis {
  const revenueBookings = bookings.filter(isRevenueBooking);
  const totalRevenue = revenueBookings.reduce((s, b) => s + parseBookingAmount(b.total), 0);
  const activeListings = listings.filter((l) => l.status === "approved").length;

  const activeCutoff = daysAgo(ACTIVE_HOST_DAYS);
  const hostUsers = resolveAdminHosts(hosts, listings);
  const activeHostIds = new Set<string>();

  for (const booking of bookings.map(resolveBookingHost)) {
    const booked = parseDate(booking.bookedAt);
    if (booked && booked >= activeCutoff && booking.hostId) {
      activeHostIds.add(booking.hostId);
    }
  }
  for (const listing of listings.filter((l) => l.status === "approved")) {
    activeHostIds.add(listing.hostId);
  }
  for (const host of hostUsers.filter((h) => h.status === "verified")) {
    activeHostIds.add(host.id);
  }

  const thisMonth = trends[trends.length - 1];
  const lastMonth = trends[trends.length - 2] ?? thisMonth;

  return {
    totalBookings: bookings.length,
    totalRevenue,
    activeHosts: activeHostIds.size,
    activeListings,
    bookingsChangePct: pctChange(thisMonth.bookings, lastMonth.bookings),
    revenueChangePct: pctChange(thisMonth.revenue, lastMonth.revenue),
    hostsChangePct: pctChange(thisMonth.newHosts, lastMonth.newHosts),
    listingsChangePct: pctChange(thisMonth.newListings, lastMonth.newListings),
    lastUpdated: new Date().toISOString(),
  };
}

function computeStatusBreakdown(bookings: HostBookingRecord[]): BookingStatusSlice[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    counts.set(b.status, (counts.get(b.status) ?? 0) + 1);
  }
  const total = bookings.length || 1;
  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status,
      count,
      pct: Math.round((count / total) * 1000) / 10,
      color: STATUS_COLORS[status] ?? "bg-gray-400",
    }))
    .sort((a, b) => b.count - a.count);
}

function listingMatchesCountry(listing: SubmittedListing, country: string): boolean {
  const haystack = `${listing.country} ${listing.state} ${listing.district} ${listing.city}`;
  if (locationMatchesCountry(haystack, country)) return true;
  return listing.country.trim().toLowerCase() === country.trim().toLowerCase();
}

function filterAnalyticsScope(
  bookings: HostBookingRecord[],
  listings: SubmittedListing[],
  hosts: AdminUserRecord[],
  country?: string
): {
  bookings: HostBookingRecord[];
  listings: SubmittedListing[];
  hosts: AdminUserRecord[];
} {
  const countryName = country?.trim();
  if (!countryName) {
    return { bookings, listings, hosts };
  }

  const filteredListings = listings.filter((l) => listingMatchesCountry(l, countryName));
  const listingIds = new Set(filteredListings.map((l) => l.id));
  const listingTitles = new Set(filteredListings.map((l) => l.title.toLowerCase()));
  const maps = buildListingMaps(listings);

  const filteredBookings = bookings.filter((b) => {
    if (b.listingId && listingIds.has(b.listingId)) return true;
    if (listingTitles.has(b.property.toLowerCase())) return true;
    const listing = resolveListingForBooking(b, maps);
    if (listing && listingMatchesCountry(listing, countryName)) return true;
    return locationMatchesCountry(
      `${b.propertyLocation} ${listing?.country ?? ""}`,
      countryName
    );
  });

  const hostIds = new Set<string>();
  for (const l of filteredListings) hostIds.add(l.hostId);
  for (const b of filteredBookings.map(resolveBookingHost)) {
    if (b.hostId) hostIds.add(b.hostId);
  }

  return {
    bookings: filteredBookings,
    listings: filteredListings,
    hosts: hosts.filter((h) => hostIds.has(h.id)),
  };
}

/** Distinct listing countries present in submissions (for filter UI). */
export function listAnalyticsCountries(): string[] {
  const names = new Set<string>();
  for (const listing of loadAllSubmissions()) {
    const c = listing.country?.trim();
    if (c) names.add(c);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function computePlatformAnalytics(
  options: PlatformAnalyticsOptions = {}
): PlatformAnalyticsSnapshot {
  const country = options.country ?? "";
  const cached = analyticsCache.get(country);
  if (cached) return cached;

  const rawBookings = loadHostBookings().map(resolveBookingHost);
  const rawListings = loadAllSubmissions();
  const rawHosts = loadAllUsers();
  const { bookings, listings, hosts } = filterAnalyticsScope(
    rawBookings,
    rawListings,
    rawHosts,
    options.country
  );
  const monthlyTrends = computeMonthlyTrends(bookings, hosts, listings);
  const { top, under } = computeHostPerformance(bookings, listings, hosts);

  const snapshot: PlatformAnalyticsSnapshot = {
    kpis: computeKpis(bookings, listings, hosts, monthlyTrends),
    monthlyTrends,
    regionalByState: computeRegional(bookings, listings, "state"),
    regionalByDistrict: computeRegional(bookings, listings, "district").slice(0, 12),
    topHosts: top,
    underperformingHosts: under,
    churn: computeChurn(bookings, hosts, listings),
    bookingStatusBreakdown: computeStatusBreakdown(bookings),
  };
  analyticsCache.set(country, snapshot);
  return snapshot;
}

const analyticsCache = new Map<string, PlatformAnalyticsSnapshot>();

export function invalidatePlatformAnalyticsCache() {
  analyticsCache.clear();
}

if (typeof window !== "undefined") {
  const invalidate = () => invalidatePlatformAnalyticsCache();
  window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, invalidate);
  window.addEventListener(LISTINGS_SYNC_EVENT, invalidate);
  window.addEventListener(USERS_SYNC_EVENT, invalidate);
}

export function formatPlatformMoney(
  amount: number,
  currencyOrCountry: string = DISPLAY_DEFAULT_CURRENCY
): string {
  const currency = /^[A-Z]{3}$/.test(currencyOrCountry)
    ? currencyOrCountry
    : currencyForCountryName(currencyOrCountry);
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

export function formatChangePct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}% vs last month`;
}
