"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LISTING_ADS_SYNC_EVENT,
  loadListingAds,
  saveListingAds,
} from "./listing-ads-data";
import {
  fetchListingAdsFromApi,
  saveListingAdsToApi,
  shouldUseSharedListingAds,
} from "./listing-ads-api";
import type { ListingAdsSettings, ListingSidebarAd } from "./listing-ads-types";

export function useListingAds() {
  const [settings, setSettings] = useState<ListingAdsSettings | null>(() => loadListingAds());
  const [ready, setReady] = useState(true);
  const shared = shouldUseSharedListingAds();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        setSettings(await fetchListingAdsFromApi());
      } catch {
        setSettings(loadListingAds());
      }
    } else {
      setSettings(loadListingAds());
    }
    setReady(true);
  }, [shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-listing-ads") void refresh();
    }
    window.addEventListener(LISTING_ADS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LISTING_ADS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function persist(next: ListingAdsSettings) {
    if (shared) {
      try {
        const saved = await saveListingAdsToApi(next);
        setSettings(saved);
        window.dispatchEvent(new Event(LISTING_ADS_SYNC_EVENT));
        return saved;
      } catch {
        const saved = saveListingAds(next);
        setSettings(saved);
        return saved;
      }
    }
    const saved = saveListingAds(next);
    setSettings(saved);
    return saved;
  }

  return {
    ready,
    settings,
    refresh,
    save: (next: ListingAdsSettings) => {
      void persist(next);
    },
    updateAd: (id: string, patch: Partial<ListingSidebarAd>) => {
      if (!settings) return;
      void persist({
        ads: settings.ads.map((ad) => (ad.id === id ? { ...ad, ...patch } : ad)),
      });
    },
    addAd: (ad: ListingSidebarAd) => {
      if (!settings) return;
      void persist({ ads: [...settings.ads, ad] });
    },
    removeAd: (id: string) => {
      if (!settings) return;
      void persist({ ads: settings.ads.filter((ad) => ad.id !== id) });
    },
  };
}
