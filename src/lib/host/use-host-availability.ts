"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_AVAILABILITY_SYNC_EVENT,
  getAvailabilitySettings,
  saveAvailabilitySettings,
} from "./host-availability-data";
import {
  fetchAvailabilityFromApi,
  saveAvailabilityToApi,
  shouldUseSharedAvailabilityStore,
} from "./host-availability-api";
import type { ListingAvailabilitySettings, SeasonalPeriod } from "./host-availability-types";

export function useHostAvailability(listingId?: string) {
  const [settings, setSettings] = useState<ListingAvailabilitySettings | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedAvailabilityStore();

  const refresh = useCallback(async () => {
    if (!listingId) {
      setSettings(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        const fromApi = await fetchAvailabilityFromApi(listingId);
        setSettings(fromApi ?? getAvailabilitySettings(listingId));
      } catch {
        setSettings(getAvailabilitySettings(listingId));
      }
    } else {
      setSettings(getAvailabilitySettings(listingId));
    }
    setReady(true);
  }, [listingId, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-availability") void refresh();
    }
    window.addEventListener(HOST_AVAILABILITY_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_AVAILABILITY_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function persist(next: ListingAvailabilitySettings) {
    if (shared) {
      try {
        const saved = await saveAvailabilityToApi(next);
        setSettings(saved);
        window.dispatchEvent(new Event(HOST_AVAILABILITY_SYNC_EVENT));
        return saved;
      } catch {
        saveAvailabilitySettings(next);
        setSettings(next);
        return next;
      }
    }
    saveAvailabilitySettings(next);
    setSettings(next);
    return next;
  }

  return {
    ready,
    settings,
    refresh,
    toggleDate: (date: string) => {
      if (!settings) return null;
      const blocked = new Set(settings.blockedDates);
      if (blocked.has(date)) blocked.delete(date);
      else blocked.add(date);
      void persist({ ...settings, blockedDates: Array.from(blocked).sort() });
      return null;
    },
    updateSettings: (updates: Partial<ListingAvailabilitySettings>) => {
      if (!settings) return null;
      void persist({ ...settings, ...updates });
      return null;
    },
    addSeason: (period: Omit<SeasonalPeriod, "id"> & { id?: string }) => {
      if (!settings) return null;
      void persist({
        ...settings,
        seasonalPeriods: [
          ...settings.seasonalPeriods,
          { ...period, id: period.id ?? `season-${Date.now()}` },
        ],
      });
      return null;
    },
    removeSeason: (id: string) => {
      if (!settings) return null;
      void persist({
        ...settings,
        seasonalPeriods: settings.seasonalPeriods.filter((s) => s.id !== id),
      });
      return null;
    },
    importIcalDates: (dates: string[]) => {
      if (!settings) return null;
      const blocked = new Set(settings.blockedDates);
      for (const d of dates) blocked.add(d);
      void persist({
        ...settings,
        blockedDates: Array.from(blocked).sort(),
        lastIcalImportAt: new Date().toISOString(),
      });
      return null;
    },
  };
}
