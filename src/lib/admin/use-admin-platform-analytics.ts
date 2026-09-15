"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HOST_BOOKINGS_SYNC_EVENT, mergeServerHostBookings } from "@/lib/host/host-booking-data";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { HOST_REVIEWS_SYNC_EVENT } from "@/lib/host/host-reviews-data";
import { LISTINGS_SYNC_EVENT } from "@/lib/listings/submission-data";
import { USERS_SYNC_EVENT } from "@/lib/admin/user-data";
import {
  computePlatformAnalytics,
  listAnalyticsCountries,
} from "./platform-analytics-data";
import type { PlatformAnalyticsSnapshot } from "./platform-analytics-types";

const EMPTY_SNAPSHOT: PlatformAnalyticsSnapshot = {
  kpis: {
    totalBookings: 0,
    totalRevenue: 0,
    activeHosts: 0,
    activeListings: 0,
    bookingsChangePct: 0,
    revenueChangePct: 0,
    hostsChangePct: 0,
    listingsChangePct: 0,
    lastUpdated: new Date().toISOString(),
  },
  monthlyTrends: [],
  regionalByState: [],
  regionalByDistrict: [],
  topHosts: [],
  underperformingHosts: [],
  churn: {
    inactiveHosts: 0,
    churnedHosts: 0,
    churnRatePct: 0,
    hostGrowthPct: 0,
    listingGrowthPct: 0,
    inactiveHostRows: [],
  },
  bookingStatusBreakdown: [],
};

let pullInflight: Promise<void> | null = null;
let pulledAt = 0;

async function pullServerBookings(): Promise<void> {
  if (pullInflight) return pullInflight;
  if (Date.now() - pulledAt < 8_000) return;
  pullInflight = (async () => {
    try {
      const res = await fetch("/api/bookings?role=host");
      if (!res.ok) return;
      const data = (await res.json()) as { bookings?: HostBookingRecord[] };
      if (Array.isArray(data.bookings) && data.bookings.length > 0) {
        mergeServerHostBookings(data.bookings);
      }
      pulledAt = Date.now();
    } catch {
      // local analytics still work offline
    } finally {
      pullInflight = null;
    }
  })();
  return pullInflight;
}

export function useAdminPlatformAnalytics(countryFilter = "") {
  const [snapshot, setSnapshot] = useState<PlatformAnalyticsSnapshot>(() =>
    computePlatformAnalytics({ country: countryFilter || undefined })
  );
  const [ready, setReady] = useState(true);
  const [availableCountries, setAvailableCountries] = useState<string[]>(() =>
    listAnalyticsCountries()
  );

  const refreshLocal = useCallback(() => {
    setSnapshot(computePlatformAnalytics({ country: countryFilter || undefined }));
    setAvailableCountries(listAnalyticsCountries());
  }, [countryFilter]);

  const refresh = useCallback(async () => {
    await pullServerBookings();
    refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    refreshLocal();
    void refresh();

    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, refreshLocal);
    window.addEventListener(LISTINGS_SYNC_EVENT, refreshLocal);
    window.addEventListener(USERS_SYNC_EVENT, refreshLocal);
    window.addEventListener(HOST_REVIEWS_SYNC_EVENT, refreshLocal);
    window.addEventListener("storage", refreshLocal);

    const interval = window.setInterval(() => void refresh(), 30000);

    return () => {
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, refreshLocal);
      window.removeEventListener(LISTINGS_SYNC_EVENT, refreshLocal);
      window.removeEventListener(USERS_SYNC_EVENT, refreshLocal);
      window.removeEventListener(HOST_REVIEWS_SYNC_EVENT, refreshLocal);
      window.removeEventListener("storage", refreshLocal);
      window.clearInterval(interval);
    };
  }, [refresh, refreshLocal]);

  const lastUpdatedLabel = useMemo(() => {
    const d = new Date(snapshot.kpis.lastUpdated);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [snapshot.kpis.lastUpdated]);

  return {
    ready,
    snapshot,
    refresh,
    lastUpdatedLabel,
    availableCountries,
    countryFilter,
  };
}
