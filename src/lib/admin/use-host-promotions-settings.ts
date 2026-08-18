"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_PROMOTIONS_SETTINGS_SYNC_EVENT,
  loadHostPromotionsSettings,
  resetHostPromotionsSettings,
  saveHostPromotionsSettings,
  updateHostPromotionsSettings,
  updatePromotionPackage,
} from "./host-promotions-settings-data";
import {
  fetchPromotionCatalogFromApi,
  savePromotionCatalogToApi,
  shouldUseSharedPromotionCatalog,
} from "./host-promotions-settings-api";
import type {
  HostPromotionsSettings,
  ListingPromotionPackage,
} from "@/lib/host/host-promotions-types";

export function useHostPromotionsSettings() {
  const [settings, setSettings] = useState<HostPromotionsSettings | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedPromotionCatalog();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        setSettings(await fetchPromotionCatalogFromApi());
      } catch {
        setSettings(loadHostPromotionsSettings());
      }
    } else {
      setSettings(loadHostPromotionsSettings());
    }
    setReady(true);
  }, [shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-promotions-settings") void refresh();
    }
    window.addEventListener(HOST_PROMOTIONS_SETTINGS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_PROMOTIONS_SETTINGS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function persist(next: HostPromotionsSettings) {
    if (shared) {
      try {
        const saved = await savePromotionCatalogToApi(next);
        setSettings(saved);
        window.dispatchEvent(new Event(HOST_PROMOTIONS_SETTINGS_SYNC_EVENT));
        return saved;
      } catch {
        saveHostPromotionsSettings(next);
        setSettings(next);
        return next;
      }
    }
    saveHostPromotionsSettings(next);
    setSettings(next);
    return next;
  }

  return {
    ready,
    settings,
    refresh,
    save: (next: HostPromotionsSettings) => {
      void persist(next);
    },
    patch: (partial: Partial<HostPromotionsSettings>) => {
      if (!settings) return;
      void persist({ ...settings, ...partial });
    },
    updatePackage: (id: string, patch: Partial<ListingPromotionPackage>) => {
      if (!settings) return;
      const packages = settings.packages.map((p) =>
        p.id === id ? { ...p, ...patch, id: p.id } : p
      );
      void persist({ ...settings, packages });
    },
    resetDefaults: () => {
      if (shared) {
        void persist(loadHostPromotionsSettings());
      } else {
        resetHostPromotionsSettings();
        void refresh();
      }
    },
  };
}
