"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_PROMOTIONS_SYNC_EVENT,
  getActivePromotion,
  hasActivePromotion,
  loadAllPromotions,
  loadPromotionsForListing,
  purchasePromotion,
} from "./host-promotions-data";
import {
  fetchPromotionsFromApi,
  shouldUseSharedPromotions,
} from "./host-promotions-api";
import type {
  ListingPromotion,
  ListingPromotionDurationDays,
  ListingPromotionKind,
} from "./host-promotions-types";

export function useHostPromotions(listingId?: string, hostId?: string) {
  const [promotions, setPromotions] = useState<ListingPromotion[]>([]);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedPromotions();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        const fromApi = await fetchPromotionsFromApi({
          listingId: listingId || undefined,
          hostId: !listingId ? hostId : undefined,
        });
        setPromotions(fromApi);
      } catch {
        setPromotions(
          listingId ? loadPromotionsForListing(listingId) : loadAllPromotions()
        );
      }
    } else {
      setPromotions(
        listingId ? loadPromotionsForListing(listingId) : loadAllPromotions()
      );
    }
    setReady(true);
  }, [listingId, hostId, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-promotions") void refresh();
    }
    window.addEventListener(HOST_PROMOTIONS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_PROMOTIONS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const now = new Date();

  const confirmPayment = useCallback(
    async (promotionId: string, sessionId: string) => {
      const { confirmPromotionViaApi } = await import("./host-promotions-api");
      const saved = await confirmPromotionViaApi(promotionId, sessionId);
      await refresh();
      return saved;
    },
    [refresh]
  );

  return {
    ready,
    promotions,
    activeTrending: listingId
      ? promotions.find(
          (p) =>
            p.listingId === listingId &&
            p.kind === "trending" &&
            p.status === "active" &&
            new Date(p.endsAt) > now
        ) ?? (shared ? null : getActivePromotion(listingId, "trending"))
      : null,
    activeFeatured: listingId
      ? promotions.find(
          (p) =>
            p.listingId === listingId &&
            p.kind === "featured" &&
            p.status === "active" &&
            new Date(p.endsAt) > now
        ) ?? (shared ? null : getActivePromotion(listingId, "featured"))
      : null,
    isTrendingActive: listingId
      ? promotions.some(
          (p) =>
            p.listingId === listingId &&
            p.kind === "trending" &&
            p.status === "active" &&
            new Date(p.endsAt) > now
        ) || (!shared && hasActivePromotion(listingId, "trending"))
      : false,
    isFeaturedActive: listingId
      ? promotions.some(
          (p) =>
            p.listingId === listingId &&
            p.kind === "featured" &&
            p.status === "active" &&
            new Date(p.endsAt) > now
        ) || (!shared && hasActivePromotion(listingId, "featured"))
      : false,
    refresh,
    purchase: async (input: {
      listingId: string;
      hostId: string;
      kind: ListingPromotionKind;
      durationDays: ListingPromotionDurationDays;
      listingTitle?: string;
    }) => {
      const saved = await purchasePromotion(input);
      await refresh();
      return saved;
    },
    confirmPayment,
  };
}
