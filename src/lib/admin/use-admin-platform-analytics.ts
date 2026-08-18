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

async function pullServerBookings(): Promise<void> {
  try {
    const res = await fetch("/api/bookings?role=host");
    if (!res.ok) return;
    const data = (await res.json()) as { bookings?: HostBookingRecord[] };
    if (Array.isArray(data.bookings) && data.bookings.length > 0) {
      mergeServerHostBookings(data.bookings);
    }
  } catch {
    // local analytics still work offline
  }
}

export function useAdminPlatformAnalytics(countryFilter = "") {
  const [snapshot, setSnapshot] = useState<PlatformAnalyticsSnapshot>(EMPTY_SNAPSHOT);
  const [ready, setReady] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    await pullServerBookings();
    setSnapshot(computePlatformAnalytics({ country: countryFilter || undefined }));
    setAvailableCountries(listAnalyticsCountries());
  }, [countryFilter]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      await refresh();
      if (!cancelled) setReady(true);
    }
    void boot();

    function onSync() {
      void refresh();
    }

    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, onSync);
    window.addEventListener(LISTINGS_SYNC_EVENT, onSync);
    window.addEventListener(USERS_SYNC_EVENT, onSync);
    window.addEventListener(HOST_REVIEWS_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);

    const interval = window.setInterval(() => void refresh(), 30000);

    return () => {
      cancelled = true;
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, onSync);
      window.removeEventListener(LISTINGS_SYNC_EVENT, onSync);
      window.removeEventListener(USERS_SYNC_EVENT, onSync);
      window.removeEventListener(HOST_REVIEWS_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
      window.clearInterval(interval);
    };
  }, [refresh]);

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
