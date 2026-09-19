import type { HostAnalyticsData, HostOverviewStats } from "./host-analytics-types";
import { LAUNCH_CURRENCY } from "@/lib/tax/launch-market";

export type AnalyticsListing = {
  id: string;
  hostId: string;
  status: string;
  pricePerNight: number | null;
  district: string;
};

export type AnalyticsBooking = {
  listingId: string;
  guestId: string;
  checkIn: Date;
  checkOut: Date | null;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  createdAt: Date;
};

export type AnalyticsReview = {
  listingId: string;
  rating: number;
};

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function monthLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "short" });
}

function monthPeriod(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function nightsOverlapping(
  checkIn: Date,
  checkOut: Date | null,
  rangeStart: Date,
  rangeEnd: Date
): number {
  const stayEnd = checkOut ?? new Date(checkIn.getTime() + MS_DAY);
  const from = checkIn > rangeStart ? checkIn : rangeStart;
  const to = stayEnd < rangeEnd ? stayEnd : rangeEnd;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / MS_DAY));
}

function isLiveStay(status: string): boolean {
  const s = status.toLowerCase();
  return s === "pending" || s === "confirmed" || s === "completed";
}

function isPaidStay(booking: AnalyticsBooking): boolean {
  if (!isLiveStay(booking.status)) return false;
  const p = booking.paymentStatus.toLowerCase();
  return p === "paid" || p.includes("paid");
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function occupancyForMonth(
  listings: AnalyticsListing[],
  bookings: AnalyticsBooking[],
  month: Date
): number {
  const approved = listings.filter((l) => l.status === "approved").length;
  if (approved === 0) return 0;
  const start = startOfMonth(month);
  const end = addMonths(month, 1);
  const capacity = approved * daysInMonth(month);
  const booked = bookings
    .filter((b) => isLiveStay(b.status))
    .reduce((sum, b) => sum + nightsOverlapping(b.checkIn, b.checkOut, start, end), 0);
  return Math.round(Math.min(100, (booked / capacity) * 100));
}

function lastMonths(count: number, from = new Date()): Date[] {
  const cursor = startOfMonth(from);
  return Array.from({ length: count }, (_, i) => addMonths(cursor, i - (count - 1)));
}

export function emptyOverview(): HostOverviewStats {
  return {
    activeListings: 0,
    pendingListings: 0,
    bookings: 0,
    bookingsThisWeek: 0,
    earnings: 0,
    earningsThisMonth: 0,
    avgRating: 0,
    reviewCount: 0,
  };
}

export function computeHostAnalytics(input: {
  hostId: string;
  listings: AnalyticsListing[];
  bookings: AnalyticsBooking[];
  reviews: AnalyticsReview[];
  nearbyListings?: AnalyticsListing[];
  nearbyBookings?: AnalyticsBooking[];
  nearbyReviews?: AnalyticsReview[];
}): HostAnalyticsData {
  const { hostId, listings, bookings, reviews } = input;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * MS_DAY);
  const monthStart = startOfMonth(now);

  const liveBookings = bookings.filter((b) => isLiveStay(b.status));
  const paid = bookings.filter(isPaidStay);
  const ratings = reviews.map((r) => r.rating).filter((n) => n > 0);

  const overview: HostOverviewStats = {
    activeListings: listings.filter((l) => l.status === "approved").length,
    pendingListings: listings.filter((l) => l.status === "pending").length,
    bookings: liveBookings.length,
    bookingsThisWeek: bookings.filter((b) => b.createdAt >= weekAgo).length,
    earnings: Math.round(paid.reduce((sum, b) => sum + b.totalPrice, 0)),
    earningsThisMonth: Math.round(
      paid
        .filter((b) => b.checkIn >= monthStart || b.createdAt >= monthStart)
        .reduce((sum, b) => sum + b.totalPrice, 0)
    ),
    avgRating: ratings.length ? Math.round(avg(ratings) * 10) / 10 : 0,
    reviewCount: ratings.length,
  };

  const sixMonths = lastMonths(6, now);
  const occupancyTrend = sixMonths.map((month) => ({
    month: monthLabel(month),
    ratePct: occupancyForMonth(listings, bookings, month),
  }));

  const bookingTrend = sixMonths.map((month) => {
    const start = startOfMonth(month);
    const end = addMonths(month, 1);
    return {
      month: monthLabel(month),
      bookings: bookings.filter((b) => b.createdAt >= start && b.createdAt < end).length,
    };
  });

  const fiveMonths = lastMonths(5, now);
  const revenueMonthly = fiveMonths.map((month) => {
    const start = startOfMonth(month);
    const end = addMonths(month, 1);
    const amount = paid
      .filter((b) => {
        const when = b.checkIn;
        return when >= start && when < end;
      })
      .reduce((sum, b) => sum + b.totalPrice, 0);
    return { period: monthPeriod(month), amount: Math.round(amount) };
  });

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];
  const revenueYearly = years.map((year) => {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const amount = paid
      .filter((b) => b.checkIn >= start && b.checkIn < end)
      .reduce((sum, b) => sum + b.totalPrice, 0);
    return {
      period: year === now.getFullYear() ? `${year} YTD` : String(year),
      amount: Math.round(amount),
    };
  });

  const guestCounts = new Map<string, number>();
  for (const b of liveBookings) {
    guestCounts.set(b.guestId, (guestCounts.get(b.guestId) ?? 0) + 1);
  }
  const uniqueGuests = guestCounts.size;
  const repeatGuests = Array.from(guestCounts.values()).filter((n) => n > 1).length;

  const nearbyListings = input.nearbyListings ?? [];
  const nearbyBookings = input.nearbyBookings ?? [];
  const nearbyReviews = input.nearbyReviews ?? [];
  const nearbyOcc = occupancyForMonth(nearbyListings, nearbyBookings, startOfMonth(now));
  const yoursNightly = avg(
    listings.map((l) => l.pricePerNight ?? 0).filter((n) => n > 0)
  );
  const nearbyNightly = avg(
    nearbyListings.map((l) => l.pricePerNight ?? 0).filter((n) => n > 0)
  );
  const nearbyRating = avg(nearbyReviews.map((r) => r.rating).filter((n) => n > 0));

  return {
    hostId,
    overview,
    occupancyRatePct: occupancyTrend[occupancyTrend.length - 1]?.ratePct ?? 0,
    occupancyTrend,
    bookingTrend,
    revenueMonthly,
    revenueYearly,
    demographics: {
      domesticPct: 0,
      internationalPct: 0,
      repeatGuestPct: uniqueGuests ? Math.round((repeatGuests / uniqueGuests) * 100) : 0,
      topCountries: [],
    },
    benchmarks: [
      {
        label: "Occupancy rate",
        yours: occupancyTrend[occupancyTrend.length - 1]?.ratePct ?? 0,
        nearbyAvg: nearbyOcc,
        unit: "%",
      },
      {
        label: "Avg nightly rate",
        yours: Math.round(yoursNightly),
        nearbyAvg: Math.round(nearbyNightly),
        unit: LAUNCH_CURRENCY,
      },
      {
        label: "Guest rating",
        yours: overview.avgRating,
        nearbyAvg: nearbyRating ? Math.round(nearbyRating * 10) / 10 : 0,
        unit: "/5",
      },
    ],
  };
}
