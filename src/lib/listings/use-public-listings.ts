"use client";

import { useCallback, useEffect, useState } from "react";
import { STAYS, type Stay } from "@/lib/mock/data";
import { LISTINGS_SYNC_EVENT } from "./submission-data";
import { CONTENT_POLICY_SYNC_EVENT } from "@/lib/admin/content-policy-data";
import { PLATFORM_CONFIG_SYNC_EVENT } from "@/lib/admin/platform-config-data";
import { HOST_PROMOTIONS_SYNC_EVENT } from "@/lib/host/host-promotions-data";
import { STAY_REVIEWS_SYNC_EVENT } from "@/lib/booking/stay-reviews-data";
import { refreshPromotedIdsFromApi } from "./promotions-cache";
import { getPublicListings } from "./public-listings";

export function usePublicListings() {
  const [listings, setListings] = useState<Stay[]>(() => [...STAYS]);

  const refresh = useCallback(() => {
    setListings(getPublicListings());
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshPromotedIdsFromApi(true);
      refresh();
    })();

    function onStorage(e: StorageEvent) {
      if (
        e.key === "farm-stays-listing-submissions" ||
        e.key === "farm-stays-deleted-listing-ids" ||
        e.key === "farm-stays-platform-config" ||
        e.key === "farm-stays-host-promotions" ||
        e.key === "farm-stays-stay-reviews"
      ) {
        refresh();
      }
    }

    function onPromoSync() {
      void refreshPromotedIdsFromApi(true).then(refresh);
    }

    window.addEventListener(LISTINGS_SYNC_EVENT, refresh);
    window.addEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
    window.addEventListener(PLATFORM_CONFIG_SYNC_EVENT, refresh);
    window.addEventListener(HOST_PROMOTIONS_SYNC_EVENT, onPromoSync);
    window.addEventListener(STAY_REVIEWS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(LISTINGS_SYNC_EVENT, refresh);
      window.removeEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
      window.removeEventListener(PLATFORM_CONFIG_SYNC_EVENT, refresh);
      window.removeEventListener(HOST_PROMOTIONS_SYNC_EVENT, onPromoSync);
      window.removeEventListener(STAY_REVIEWS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return { listings, refresh };
}
