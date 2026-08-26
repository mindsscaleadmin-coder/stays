"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPricingFromApi, shouldUseSharedPricingStore } from "@/lib/host/host-pricing-api";
import { loadPricingSettings, savePricingSettings } from "@/lib/host/host-pricing-data";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import type { BookingCartLine } from "@/lib/guest/booking-cart";

/** Load host pricing for every listing in the cart from the shared store. */
export function useCartPricing(lines: BookingCartLine[]) {
  const listingIds = useMemo(
    () => Array.from(new Set(lines.map((line) => line.listingId).filter(Boolean))),
    [lines]
  );
  const [pricingByListing, setPricingByListing] = useState<
    Record<string, ListingPricingSettings>
  >({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next: Record<string, ListingPricingSettings> = {};
      await Promise.all(
        listingIds.map(async (id) => {
          if (shouldUseSharedPricingStore()) {
            const fromApi = await fetchPricingFromApi(id).catch(() => null);
            if (fromApi) {
              savePricingSettings(fromApi);
              next[id] = fromApi;
              return;
            }
          }
          next[id] = loadPricingSettings(id);
        })
      );
      if (!cancelled) setPricingByListing(next);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [listingIds]);

  return pricingByListing;
}
