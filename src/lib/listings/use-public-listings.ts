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
import {
  bustApprovedPublicStaysCache,
  fetchApprovedPublicStaysPage,
} from "./public-listings-api";
import { HOST_PRICING_SYNC_EVENT } from "@/lib/host/host-pricing-data";
import { PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE } from "./listings-pagination";

let listingsRefreshInflight: Promise<void> | null = null;
let listingsRefreshInflightKey = "";
let listingsResultCache: {
  key: string;
  stays: Stay[];
  total: number;
  at: number;
} | null = null;
const LISTINGS_RESULT_CACHE_MS = 30_000;

export function usePublicListings(
  initial?: Stay[],
  opts?: {
    country?: string;
    /** When true, keep SSR page data and do not re-fetch the full catalog. */
    serverPaginated?: boolean;
    page?: number;
    pageSize?: number;
    /** When false, skip catalog fetch and sync listeners (e.g. account profile tab). */
    enabled?: boolean;
  }
) {
  const country = opts?.country?.trim() || "";
  const serverPaginated = Boolean(opts?.serverPaginated);
  const enabled = opts?.enabled ?? true;
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE;
  const [listings, setListings] = useState<Stay[]>(() => {
    if (initial && initial.length > 0) return initial;
    const country = opts?.country?.trim() || "";
    const pageSize = opts?.pageSize ?? PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE;
    const key = `${country}|${pageSize}`;
    if (
      listingsResultCache &&
      listingsResultCache.key === key &&
      Date.now() - listingsResultCache.at < LISTINGS_RESULT_CACHE_MS
    ) {
      return listingsResultCache.stays;
    }
    return [];
  });
  const [total, setTotal] = useState(() => {
    const country = opts?.country?.trim() || "";
    const pageSize = opts?.pageSize ?? PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE;
    const key = `${country}|${pageSize}`;
    if (
      listingsResultCache &&
      listingsResultCache.key === key &&
      Date.now() - listingsResultCache.at < LISTINGS_RESULT_CACHE_MS
    ) {
      return listingsResultCache.total;
    }
    if (serverPaginated && typeof opts?.pageSize === "number") {
      return initial?.length ?? 0;
    }
    return initial?.length ?? 0;
  });

  useEffect(() => {
    if (initial) setListings(initial);
  }, [initial]);

  const refresh = useCallback(async () => {
    if (serverPaginated || !enabled) {
      // Listings browse is SSR-paginated; URL changes reload the page. Avoid
      // pulling the entire approved catalog into the client.
      return;
    }
    const inflightKey = `${country}|${pageSize}`;
    if (listingsRefreshInflight && listingsRefreshInflightKey === inflightKey) {
      return listingsRefreshInflight;
    }
    listingsRefreshInflightKey = inflightKey;
    listingsRefreshInflight = (async () => {
      let count = 0;
      if (isSharedListingsEnabled()) {
        try {
          const result = await fetchApprovedPublicStaysPage({
            country: country || undefined,
            page: 1,
            pageSize,
          });
          setListings(result.stays);
          setTotal(result.total);
          listingsResultCache = {
            key: inflightKey,
            stays: result.stays,
            total: result.total,
            at: Date.now(),
          };
          count = result.stays.length;
        } catch (error) {
          console.error(error);
        }
      }
      if (count === 0) {
        const local = getPublicListings();
        setListings(local);
        setTotal(local.length);
        listingsResultCache = {
          key: inflightKey,
          stays: local,
          total: local.length,
          at: Date.now(),
        };
      }
    })().finally(() => {
      if (listingsRefreshInflightKey === inflightKey) {
        listingsRefreshInflight = null;
      }
    });
    return listingsRefreshInflight;
  }, [country, pageSize, serverPaginated, enabled]);

  useEffect(() => {
    if (serverPaginated || !enabled) return;

    const inflightKey = `${country}|${pageSize}`;
    if (
      listingsResultCache &&
      listingsResultCache.key === inflightKey &&
      Date.now() - listingsResultCache.at < LISTINGS_RESULT_CACHE_MS
    ) {
      return;
    }

    void (async () => {
      await Promise.all([refreshPromotedIdsFromApi(false), refresh()]);
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
        void refresh();
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
  }, [refresh, serverPaginated, enabled, country, pageSize]);

  return { listings, total, refresh, page, pageSize };
}
