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
  const [settings, setSettings] = useState<ListingPricingSettings | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedPricingStore();

  const settingsRef = useRef<ListingPricingSettings | null>(null);
  const persistGen = useRef(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistLatest = useCallback(async () => {
    const snapshot = settingsRef.current;
    if (!snapshot) return null;
    const gen = ++persistGen.current;

    if (shared) {
      try {
        const saved = await savePricingToApi(snapshot);
        if (settingsRef.current !== snapshot) {
          return persistLatest();
        }
        if (gen !== persistGen.current) return snapshot;
        savePricingSettings(saved);
        settingsRef.current = saved;
        setSettings(saved);
        window.dispatchEvent(new Event(HOST_PRICING_SYNC_EVENT));
        return saved;
      } catch {
        if (settingsRef.current !== snapshot) {
          return persistLatest();
        }
        if (gen !== persistGen.current) return snapshot;
        savePricingSettings(snapshot);
        settingsRef.current = snapshot;
        setSettings(snapshot);
        return snapshot;
      }
    }

    savePricingSettings(snapshot);
    settingsRef.current = snapshot;
    setSettings(snapshot);
    return snapshot;
  }, [shared]);

  const refresh = useCallback(async () => {
    if (!listingId) {
      settingsRef.current = null;
      setSettings(null);
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
        savePricingSettings(next);
        settingsRef.current = next;
        setSettings(next);
        if (shouldPersist) void persistLatest();
      } catch {
        const next = loadPricingSettings(listingId, country);
        settingsRef.current = next;
        setSettings(next);
      }
    } else {
      const next = loadPricingSettings(listingId, country);
      settingsRef.current = next;
      setSettings(next);
    }
    setReady(true);
  }, [listingId, country, persistLatest, shared]);

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
      const next = country
        ? applyCountryPricing({ ...current, ...updates }, country)
        : { ...current, ...updates };
      settingsRef.current = next;
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
    [country, persistLatest]
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
