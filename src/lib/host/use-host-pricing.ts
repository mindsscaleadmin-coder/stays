"use client";

import { useCallback, useEffect, useState } from "react";
import type { CountryPricingConfig } from "@/lib/admin/country-utils";
import {
  applyCountryPricing,
  HOST_PRICING_SYNC_EVENT,
  loadPricingSettings,
  newExtraChargeId,
  newSeasonalPriceId,
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

  const refresh = useCallback(async () => {
    if (!listingId) {
      setSettings(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        const fromApi = await fetchPricingFromApi(listingId, country);
        setSettings(fromApi ?? loadPricingSettings(listingId, country));
      } catch {
        setSettings(loadPricingSettings(listingId, country));
      }
    } else {
      setSettings(loadPricingSettings(listingId, country));
    }
    setReady(true);
  }, [listingId, country?.countryId, country?.currency, country?.taxPct, country?.taxLabel, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-pricing") void refresh();
    }
    window.addEventListener(HOST_PRICING_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_PRICING_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function persist(next: ListingPricingSettings) {
    if (shared) {
      try {
        const saved = await savePricingToApi(next);
        setSettings(saved);
        window.dispatchEvent(new Event(HOST_PRICING_SYNC_EVENT));
        return saved;
      } catch {
        savePricingSettings(next);
        setSettings(next);
        return next;
      }
    }
    savePricingSettings(next);
    setSettings(next);
    return next;
  }

  function save(updates: Partial<ListingPricingSettings>) {
    if (!settings) return null;
    const next = country
      ? applyCountryPricing({ ...settings, ...updates }, country)
      : { ...settings, ...updates };
    void persist(next);
    return next;
  }

  function setRoomPrice(
    roomId: string,
    patch: Partial<Pick<RoomPricing, "basePrice" | "weekendPrice" | "monthlyPrice">>
  ) {
    if (!settings) return;
    const existing = settings.roomPrices.find((r) => r.roomId === roomId);
    const nextEntry: RoomPricing = {
      roomId,
      basePrice: patch.basePrice !== undefined ? patch.basePrice : (existing?.basePrice ?? null),
      weekendPrice:
        patch.weekendPrice !== undefined ? patch.weekendPrice : (existing?.weekendPrice ?? null),
      monthlyPrice:
        patch.monthlyPrice !== undefined ? patch.monthlyPrice : (existing?.monthlyPrice ?? null),
    };
    const roomPrices = existing
      ? settings.roomPrices.map((r) => (r.roomId === roomId ? nextEntry : r))
      : [...settings.roomPrices, nextEntry];
    save({ roomPrices });
  }

  return {
    ready,
    settings,
    refresh,
    save,
    setRoomPrice,
    addSeasonalPrice: (input: Omit<SeasonalPrice, "id">) => {
      if (!settings) return;
      save({
        seasonalPricing: [...settings.seasonalPricing, { ...input, id: newSeasonalPriceId() }],
      });
    },
    removeSeasonalPrice: (id: string) => {
      if (!settings) return;
      save({
        seasonalPricing: settings.seasonalPricing.filter((s) => s.id !== id),
      });
    },
    addExtraCharge: (input: Omit<ExtraCharge, "id">) => {
      if (!settings) return;
      save({
        extraCharges: [...settings.extraCharges, { ...input, id: newExtraChargeId() }],
      });
    },
    updateExtraCharge: (
      id: string,
      patch: Partial<Pick<ExtraCharge, "label" | "amount" | "billing">>
    ) => {
      if (!settings) return;
      save({
        extraCharges: settings.extraCharges.map((c) =>
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
      if (!settings) return;
      save({
        extraCharges: settings.extraCharges.filter((c) => c.id !== id),
      });
    },
  };
}
