"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CountryPricingConfig } from "@/lib/admin/country-utils";
import {
  applyCountryPricing,
  HOST_PRICING_SYNC_EVENT,
  loadPricingSettings,
  newExtraChargeId,
  newSeasonalPriceId,
  preferStoredRateIfPublishedEmpty,
  savePricingSettings,
} from "./host-pricing-data";
import {
  fetchPricingFromApi,
  savePricingToApi,
  shouldUseSharedPricingStore,
} from "./host-pricing-api";
import type {
  ExtraCharge,
  ListingPricingSettings,
  RoomPricing,
  SeasonalPrice,
} from "./host-pricing-types";

export function useHostPricing(listingId?: string, country?: CountryPricingConfig) {
  const [settings, setSettings] = useState<ListingPricingSettings | null>(() =>
    listingId ? loadPricingSettings(listingId, country) : null
  );
  const [ready, setReady] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const shared = shouldUseSharedPricingStore();

  const settingsRef = useRef<ListingPricingSettings | null>(null);
  const persistGen = useRef(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Edits the host has made that have not round-tripped to the store yet. */
  const dirtyRef = useRef(false);
  const inFlightRef = useRef(0);
  /** The listing `settingsRef` currently holds, so we can tell a reload from a swap. */
  const loadedForRef = useRef<string | undefined>(undefined);
  /** Latest listing asked for, so a slower earlier fetch cannot land last. */
  const requestedListingRef = useRef<string | undefined>(undefined);

  // Callers rebuild this config object on every render, so depend on its values
  // instead of its identity — identity churn re-ran refresh over live edits.
  const countryRef = useRef(country);
  countryRef.current = country;
  const countryKey = country
    ? `${country.countryId}|${country.currency}|${country.taxPct}|${country.taxLabel}`
    : "";

  const persistLatest = useCallback(async () => {
    const snapshot = settingsRef.current;
    if (!snapshot) return null;
    const gen = ++persistGen.current;

    if (shared) {
      inFlightRef.current += 1;
      try {
        const saved = await savePricingToApi(snapshot);
        if (settingsRef.current !== snapshot) {
          return persistLatest();
        }
        if (gen !== persistGen.current) return snapshot;
        savePricingSettings(saved);
        settingsRef.current = saved;
        setSettings(saved);
        dirtyRef.current = false;
        setSaveError(null);
        window.dispatchEvent(new Event(HOST_PRICING_SYNC_EVENT));
        return saved;
      } catch (error) {
        if (settingsRef.current !== snapshot) {
          return persistLatest();
        }
        if (gen !== persistGen.current) return snapshot;
        savePricingSettings(snapshot);
        settingsRef.current = snapshot;
        setSettings(snapshot);
        // Keep dirty so a background reload cannot replace the unsaved edit.
        setSaveError(
          error instanceof Error ? error.message : "Could not save pricing"
        );
        return snapshot;
      } finally {
        inFlightRef.current -= 1;
      }
    }

    savePricingSettings(snapshot);
    settingsRef.current = snapshot;
    setSettings(snapshot);
    dirtyRef.current = false;
    return snapshot;
  }, [shared]);

  const refresh = useCallback(async () => {
    if (!listingId) {
      settingsRef.current = null;
      loadedForRef.current = undefined;
      setSettings(null);
      setReady(true);
      return;
    }

    const country = countryRef.current;
    const switching = loadedForRef.current !== listingId;
    requestedListingRef.current = listingId;

    if (switching) {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      dirtyRef.current = false;
    } else if (dirtyRef.current || inFlightRef.current > 0) {
      // Same listing, host is mid-edit. Reloading here overwrote the rate,
      // discount, or extra being typed.
      setReady(true);
      return;
    }

    if (shared) {
      try {
        const fromApi = await fetchPricingFromApi(listingId, country);
        const local = loadPricingSettings(listingId, country);
        const { settings: next, shouldPersist } = preferStoredRateIfPublishedEmpty(
          fromApi,
          local
        );
        // The listing may have changed, or an edit landed, while in flight.
        if (requestedListingRef.current !== listingId) return;
        if (!switching && (dirtyRef.current || inFlightRef.current > 0)) {
          setReady(true);
          return;
        }
        savePricingSettings(next);
        settingsRef.current = next;
        loadedForRef.current = listingId;
        setSettings(next);
        if (shouldPersist) void persistLatest();
      } catch {
        const next = loadPricingSettings(listingId, country);
        if (requestedListingRef.current !== listingId) return;
        if (!switching && (dirtyRef.current || inFlightRef.current > 0)) {
          setReady(true);
          return;
        }
        settingsRef.current = next;
        loadedForRef.current = listingId;
        setSettings(next);
      }
    } else {
      const next = loadPricingSettings(listingId, country);
      settingsRef.current = next;
      loadedForRef.current = listingId;
      setSettings(next);
    }
    setReady(true);
    // countryRef is read through a ref; countryKey tracks the values that matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, countryKey, persistLatest, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-pricing") void refresh();
    }
    // Same-window saves already update React state. Reloading on our own
    // sync event raced the PATCH and wiped digits as the host typed.
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const save = useCallback(
    (
      updates: Partial<ListingPricingSettings>,
      options?: { immediate?: boolean }
    ) => {
      const current = settingsRef.current;
      if (!current) return null;
      const activeCountry = countryRef.current;
      const next = activeCountry
        ? applyCountryPricing({ ...current, ...updates }, activeCountry)
        : { ...current, ...updates };
      settingsRef.current = next;
      dirtyRef.current = true;
      setSettings(next);
      if (persistTimer.current) clearTimeout(persistTimer.current);
      if (options?.immediate) {
        void persistLatest();
      } else {
        persistTimer.current = setTimeout(() => {
          void persistLatest();
        }, 400);
      }
      return next;
    },
    [persistLatest]
  );

  function setRoomPrice(
    roomId: string,
    patch: Partial<Pick<RoomPricing, "basePrice" | "weekendPrice" | "monthlyPrice">>
  ) {
    const current = settingsRef.current;
    if (!current) return;
    const existing = current.roomPrices.find((r) => r.roomId === roomId);
    const nextEntry: RoomPricing = {
      roomId,
      basePrice: patch.basePrice !== undefined ? patch.basePrice : (existing?.basePrice ?? null),
      weekendPrice:
        patch.weekendPrice !== undefined ? patch.weekendPrice : (existing?.weekendPrice ?? null),
      monthlyPrice:
        patch.monthlyPrice !== undefined ? patch.monthlyPrice : (existing?.monthlyPrice ?? null),
    };
    const roomPrices = existing
      ? current.roomPrices.map((r) => (r.roomId === roomId ? nextEntry : r))
      : [...current.roomPrices, nextEntry];
    save({ roomPrices });
  }

  async function flushSave() {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current);
      persistTimer.current = null;
    }
    return persistLatest();
  }

  return {
    ready,
    settings,
    saveError,
    refresh,
    save,
    flushSave,
    setRoomPrice,
    addSeasonalPrice: (input: Omit<SeasonalPrice, "id">) => {
      const current = settingsRef.current;
      if (!current) return;
      save({
        seasonalPricing: [...current.seasonalPricing, { ...input, id: newSeasonalPriceId() }],
      });
    },
    removeSeasonalPrice: (id: string) => {
      const current = settingsRef.current;
      if (!current) return;
      save({
        seasonalPricing: current.seasonalPricing.filter((s) => s.id !== id),
      });
    },
    addExtraCharge: (input: Omit<ExtraCharge, "id">) => {
      const current = settingsRef.current;
      if (!current) return;
      save({
        extraCharges: [...current.extraCharges, { ...input, id: newExtraChargeId() }],
      });
    },
    updateExtraCharge: (
      id: string,
      patch: Partial<Pick<ExtraCharge, "label" | "amount" | "billing">>
    ) => {
      const current = settingsRef.current;
      if (!current) return;
      save({
        extraCharges: current.extraCharges.map((c) =>
          c.id === id
            ? {
                ...c,
                label: patch.label?.trim() || c.label,
                amount: patch.amount !== undefined ? Math.max(0, patch.amount) : c.amount,
                billing: patch.billing ?? c.billing,
              }
            : c
        ),
      });
    },
    removeExtraCharge: (id: string) => {
      const current = settingsRef.current;
      if (!current) return;
      save({
        extraCharges: current.extraCharges.filter((c) => c.id !== id),
      });
    },
  };
}
