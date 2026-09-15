"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HOST_AVAILABILITY_SYNC_EVENT,
  getAvailabilitySettings,
  saveAvailabilitySettings,
} from "./host-availability-data";
import {
  fetchAvailabilityState,
  saveAvailabilityToApi,
  shouldUseSharedAvailabilityStore,
  syncAvailabilityFeedsToApi,
} from "./host-availability-api";
import type {
  ListingAvailabilitySettings,
  ListingIcalFeed,
  SeasonalPeriod,
} from "./host-availability-types";

export function useHostAvailability(listingId?: string) {
  const [settings, setSettings] = useState<ListingAvailabilitySettings | null>(() =>
    listingId ? getAvailabilitySettings(listingId) : null
  );
  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [ready, setReady] = useState(true);
  const settingsRef = useRef<ListingAvailabilitySettings | null>(null);
  const shared = shouldUseSharedAvailabilityStore();

  const applySettings = useCallback((next: ListingAvailabilitySettings) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!listingId) {
      settingsRef.current = null;
      setSettings(null);
      setOccupiedDates([]);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        const fromApi = await fetchAvailabilityState(listingId, { channel: true });
        if (fromApi && !fromApi.settings.icalToken) {
          const saved = await saveAvailabilityToApi(fromApi.settings);
          applySettings(saved);
          setOccupiedDates(fromApi.occupiedDates);
        } else if (fromApi) {
          applySettings(fromApi.settings);
          setOccupiedDates(fromApi.occupiedDates);
        } else {
          applySettings(getAvailabilitySettings(listingId));
          setOccupiedDates([]);
        }
      } catch {
        applySettings(getAvailabilitySettings(listingId));
        setOccupiedDates([]);
      }
    } else {
      applySettings(getAvailabilitySettings(listingId));
      setOccupiedDates([]);
    }
    setReady(true);
  }, [applySettings, listingId, shared]);

  useEffect(() => {
    if (listingId) {
      applySettings(getAvailabilitySettings(listingId));
    }
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-availability") void refresh();
    }
    // Do not listen for HOST_AVAILABILITY_SYNC_EVENT here — persist emits it,
    // and a refetch would overwrite the click that just succeeded.
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [applySettings, listingId, refresh]);

  const persist = useCallback(
    async (next: ListingAvailabilitySettings) => {
      applySettings(next);
      if (shared) {
        const saved = await saveAvailabilityToApi(next);
        applySettings(saved);
        window.dispatchEvent(new Event(HOST_AVAILABILITY_SYNC_EVENT));
        return saved;
      }
      saveAvailabilitySettings(next);
      return next;
    },
    [applySettings, shared]
  );

  const withCurrent = useCallback(
    async (updater: (current: ListingAvailabilitySettings) => ListingAvailabilitySettings) => {
      const current = settingsRef.current;
      if (!current) throw new Error("Calendar is still loading.");
      try {
        return await persist(updater(current));
      } catch (error) {
        await refresh();
        throw error;
      }
    },
    [persist, refresh]
  );

  return {
    ready,
    settings,
    occupiedDates,
    refresh,
    toggleDate: (date: string) =>
      withCurrent((current) => {
        const blocked = new Set(current.blockedDates);
        if (blocked.has(date)) blocked.delete(date);
        else blocked.add(date);
        return { ...current, blockedDates: Array.from(blocked).sort() };
      }),
    updateSettings: (updates: Partial<ListingAvailabilitySettings>) =>
      withCurrent((current) => ({ ...current, ...updates })),
    addSeason: (period: Omit<SeasonalPeriod, "id"> & { id?: string }) =>
      withCurrent((current) => ({
        ...current,
        seasonalPeriods: [
          ...current.seasonalPeriods,
          { ...period, id: period.id ?? `season-${Date.now()}` },
        ],
      })),
    removeSeason: (id: string) =>
      withCurrent((current) => ({
        ...current,
        seasonalPeriods: current.seasonalPeriods.filter((s) => s.id !== id),
      })),
    importIcalDates: (dates: string[]) =>
      withCurrent((current) => {
        const blocked = new Set(current.blockedDates);
        for (const d of dates) blocked.add(d);
        return {
          ...current,
          blockedDates: Array.from(blocked).sort(),
          lastIcalImportAt: new Date().toISOString(),
        };
      }),
    addIcalFeed: (feed: Pick<ListingIcalFeed, "name" | "url">) =>
      withCurrent((current) => ({
        ...current,
        icalFeeds: [
          ...(current.icalFeeds ?? []),
          {
            id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: feed.name.trim() || "Airbnb / Booking.com",
            url: feed.url.trim(),
          },
        ],
      })),
    removeIcalFeed: (id: string) =>
      withCurrent((current) => ({
        ...current,
        icalFeeds: (current.icalFeeds ?? []).filter((feed) => feed.id !== id),
      })),
    syncIcalFeeds: async () => {
      if (!listingId) return null;
      if (shared) {
        const saved = await syncAvailabilityFeedsToApi(listingId);
        applySettings(saved);
        window.dispatchEvent(new Event(HOST_AVAILABILITY_SYNC_EVENT));
        return saved;
      }
      return settingsRef.current;
    },
  };
}
