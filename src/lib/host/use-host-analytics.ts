"use client";

import { useCallback, useEffect, useState } from "react";
import { loadHostAnalytics } from "./host-analytics-data";
import {
  fetchHostAnalyticsFromApi,
  shouldUseSharedHostAnalytics,
} from "./host-analytics-api";
import type { HostAnalyticsData } from "./host-analytics-types";

const HOST_ANALYTICS_PULL_TTL_MS = 30_000;
const hostAnalyticsPull = new Map<
  string,
  { data: HostAnalyticsData | null; at: number; inflight?: Promise<HostAnalyticsData | null> }
>();

async function fetchHostAnalyticsCached(hostId: string): Promise<HostAnalyticsData | null> {
  const cached = hostAnalyticsPull.get(hostId);
  if (cached?.inflight) return cached.inflight;
  if (cached && Date.now() - cached.at < HOST_ANALYTICS_PULL_TTL_MS) {
    return cached.data;
  }

  const inflight = fetchHostAnalyticsFromApi(hostId)
    .then((data) => {
      hostAnalyticsPull.set(hostId, { data, at: Date.now() });
      return data;
    })
    .catch(() => cached?.data ?? null);

  hostAnalyticsPull.set(hostId, {
    data: cached?.data ?? null,
    at: cached?.at ?? 0,
    inflight,
  });
  return inflight;
}

export function useHostAnalytics(hostId: string | undefined) {
  const [data, setData] = useState<HostAnalyticsData | null>(() =>
    hostId ? loadHostAnalytics(hostId) : null
  );
  const [ready, setReady] = useState(true);
  const shared = shouldUseSharedHostAnalytics();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        const result = await fetchHostAnalyticsCached(hostId);
        if (result) setData(result);
        setReady(true);
        return;
      } catch {
        // fall through
      }
    }

    setData(loadHostAnalytics(hostId));
    setReady(true);
  }, [hostId, shared]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ready, data };
}
