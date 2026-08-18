export interface PlatformKpis {
  totalBookings: number;
  totalRevenue: number;
  activeHosts: number;
  activeListings: number;
  bookingsChangePct: number;
  revenueChangePct: number;
  hostsChangePct: number;
  listingsChangePct: number;
  lastUpdated: string;
}

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  bookings: number;
  revenue: number;
  newHosts: number;
  newListings: number;
}

export interface RegionalPerformanceRow {
  state: string;
  district: string;
  bookings: number;
  revenue: number;
  listings: number;
  sharePct: number;
}

export type HostPerformanceTier = "top" | "average" | "underperforming";

export interface HostPerformanceRow {
  hostId: string;
  hostName: string;
  bookings: number;
  revenue: number;
  avgRating: number;
  cancellationRate: number;
  activeListings: number;
  tier: HostPerformanceTier;
}

export interface InactiveHostRow {
  hostId: string;
  hostName: string;
  lastActivityAt?: string;
  reason: string;
}

export interface ChurnMetrics {
  inactiveHosts: number;
  churnedHosts: number;
  churnRatePct: number;
  hostGrowthPct: number;
  listingGrowthPct: number;
  inactiveHostRows: InactiveHostRow[];
}

export interface BookingStatusSlice {
  status: string;
  count: number;
  pct: number;
  color: string;
}

export interface PlatformAnalyticsSnapshot {
  kpis: PlatformKpis;
  monthlyTrends: MonthlyTrendPoint[];
  regionalByState: RegionalPerformanceRow[];
  regionalByDistrict: RegionalPerformanceRow[];
  topHosts: HostPerformanceRow[];
  underperformingHosts: HostPerformanceRow[];
  churn: ChurnMetrics;
  bookingStatusBreakdown: BookingStatusSlice[];
}
