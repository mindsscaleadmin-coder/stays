import type { HostAnalyticsData } from "./host-analytics-types";

const STORAGE_KEY = "farm-stays-host-analytics";

export function defaultHostAnalytics(hostId: string): HostAnalyticsData {
  return {
    hostId,
    occupancyRatePct: 72,
    occupancyTrend: [
      { month: "Feb", ratePct: 58 },
      { month: "Mar", ratePct: 65 },
      { month: "Apr", ratePct: 70 },
      { month: "May", ratePct: 68 },
      { month: "Jun", ratePct: 75 },
      { month: "Jul", ratePct: 72 },
    ],
    bookingTrend: [
      { month: "Feb", bookings: 8 },
      { month: "Mar", bookings: 11 },
      { month: "Apr", bookings: 14 },
      { month: "May", bookings: 12 },
      { month: "Jun", bookings: 16 },
      { month: "Jul", bookings: 15 },
    ],
    revenueMonthly: [
      { period: "Mar 2026", amount: 28400 },
      { period: "Apr 2026", amount: 32100 },
      { period: "May 2026", amount: 29800 },
      { period: "Jun 2026", amount: 35600 },
      { period: "Jul 2026", amount: 33200 },
    ],
    revenueYearly: [
      { period: "2024", amount: 198000 },
      { period: "2025", amount: 245000 },
      { period: "2026 YTD", amount: 159100 },
    ],
    demographics: {
      domesticPct: 62,
      internationalPct: 38,
      repeatGuestPct: 28,
      topCountries: [
        { country: "UAE", pct: 62 },
        { country: "India", pct: 14 },
        { country: "UK", pct: 9 },
        { country: "Saudi Arabia", pct: 7 },
      ],
    },
    benchmarks: [
      { label: "Occupancy rate", yours: 72, nearbyAvg: 65, unit: "%" },
      { label: "Avg nightly rate", yours: 950, nearbyAvg: 880, unit: "AED" },
      { label: "Guest rating", yours: 4.8, nearbyAvg: 4.5, unit: "/5" },
      { label: "Response time", yours: 2, nearbyAvg: 4, unit: "hrs" },
    ],
  };
}

export function loadHostAnalytics(hostId: string): HostAnalyticsData {
  if (typeof window === "undefined") return defaultHostAnalytics(hostId);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, HostAnalyticsData>) : {};
    return map[hostId]
      ? { ...defaultHostAnalytics(hostId), ...map[hostId], hostId }
      : defaultHostAnalytics(hostId);
  } catch {
    return defaultHostAnalytics(hostId);
  }
}
