"use client";

import { useCallback, useEffect, useState } from "react";
import { loadHostAnalytics } from "./host-analytics-data";
import {
  fetchHostAnalyticsFromApi,
  shouldUseSharedHostAnalytics,
} from "./host-analytics-api";
import type { HostAnalyticsData } from "./host-analytics-types";

export function useHostAnalytics(hostId: string | undefined) {
  const [data, setData] = useState<HostAnalyticsData | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedHostAnalytics();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        setData(await fetchHostAnalyticsFromApi(hostId));
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
