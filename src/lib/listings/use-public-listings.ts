"use client";

import { useCallback, useEffect, useState } from "react";
import type { Stay } from "@/lib/mock/data";
import { isSharedListingsEnabled, LISTINGS_SYNC_EVENT } from "./submission-data";
import { CONTENT_POLICY_SYNC_EVENT } from "@/lib/admin/content-policy-data";
import { PLATFORM_CONFIG_SYNC_EVENT } from "@/lib/admin/platform-config-data";
import { HOST_PROMOTIONS_SYNC_EVENT } from "@/lib/host/host-promotions-data";
import { STAY_REVIEWS_SYNC_EVENT } from "@/lib/booking/stay-reviews-data";
import { refreshPromotedIdsFromApi } from "./promotions-cache";
import { getPublicListings } from "./public-listings";
import { bustApprovedPublicStaysCache, fetchApprovedPublicStays } from "./public-listings-api";
import { HOST_PRICING_SYNC_EVENT } from "@/lib/host/host-pricing-data";

export function usePublicListings(initial?: Stay[], opts?: { country?: string }) {
  const country = opts?.country?.trim() || "";
  const [listings, setListings] = useState<Stay[]>(() =>
    initial && initial.length > 0 ? initial : []
  );

  const refresh = useCallback(async () => {
    if (isSharedListingsEnabled()) {
      try {
        setListings(await fetchApprovedPublicStays(country ? { country } : undefined));
        return;
      } catch (error) {
        console.error(error);
      }
    }
    setListings(getPublicListings());
  }, [country]);

  useEffect(() => {
    void (async () => {
      await Promise.all([refreshPromotedIdsFromApi(true), refresh()]);
    })();

    function onStorage(e: StorageEvent) {
      if (
        e.key === "farm-stays-listing-submissions" ||
        e.key === "farm-stays-deleted-listing-ids" ||
        e.key === "farm-stays-platform-config" ||
        e.key === "farm-stays-host-promotions" ||
        e.key === "farm-stays-stay-reviews" ||
        e.key === "farm-stays-host-pricing"
      ) {
        if (e.key === "farm-stays-host-pricing") bustApprovedPublicStaysCache();
        refresh();
      }
    }

    function onPromoSync() {
      void refreshPromotedIdsFromApi(true).then(refresh);
    }

    function onPricingSync() {
      bustApprovedPublicStaysCache();
      void refresh();
    }

    window.addEventListener(LISTINGS_SYNC_EVENT, refresh);
    window.addEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
    window.addEventListener(PLATFORM_CONFIG_SYNC_EVENT, refresh);
    window.addEventListener(HOST_PROMOTIONS_SYNC_EVENT, onPromoSync);
    window.addEventListener(STAY_REVIEWS_SYNC_EVENT, refresh);
    window.addEventListener(HOST_PRICING_SYNC_EVENT, onPricingSync);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(LISTINGS_SYNC_EVENT, refresh);
      window.removeEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
      window.removeEventListener(PLATFORM_CONFIG_SYNC_EVENT, refresh);
      window.removeEventListener(HOST_PROMOTIONS_SYNC_EVENT, onPromoSync);
    window.removeEventListener(STAY_REVIEWS_SYNC_EVENT, refresh);
    window.removeEventListener(HOST_PRICING_SYNC_EVENT, onPricingSync);
    window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return { listings, refresh };
}
