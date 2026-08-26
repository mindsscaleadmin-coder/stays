import { computeHostAnalytics } from "./compute-host-analytics";
import type { HostAnalyticsData } from "./host-analytics-types";

export function defaultHostAnalytics(hostId: string): HostAnalyticsData {
  return computeHostAnalytics({
    hostId,
    listings: [],
    bookings: [],
    reviews: [],
  });
}

export function loadHostAnalytics(hostId: string): HostAnalyticsData {
  return defaultHostAnalytics(hostId);
}
