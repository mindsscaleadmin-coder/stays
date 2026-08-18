export interface OccupancyPoint {
  month: string;
  ratePct: number;
}

export interface RevenuePoint {
  period: string;
  amount: number;
}

export interface GuestDemographics {
  domesticPct: number;
  internationalPct: number;
  repeatGuestPct: number;
  topCountries: { country: string; pct: number }[];
}

export interface BenchmarkMetric {
  label: string;
  yours: number;
  nearbyAvg: number;
  unit: string;
}

export interface HostAnalyticsData {
  hostId: string;
  occupancyRatePct: number;
  occupancyTrend: OccupancyPoint[];
  bookingTrend: { month: string; bookings: number }[];
  revenueMonthly: RevenuePoint[];
  revenueYearly: RevenuePoint[];
  demographics: GuestDemographics;
  benchmarks: BenchmarkMetric[];
}
