import type { HostAnalyticsData } from "./host-analytics-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedHostAnalytics() {
  return isSharedDbEnabled();
}

export async function fetchHostAnalyticsFromApi(hostId: string): Promise<HostAnalyticsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/analytics`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load analytics");
  const json = (await res.json()) as { data: HostAnalyticsData };
  return json.data;
}
