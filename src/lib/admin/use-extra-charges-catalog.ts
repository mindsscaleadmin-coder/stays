"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCatalogItem,
  DEFAULT_EXTRA_CHARGES_CATALOG,
  EXTRA_CHARGES_CATALOG_SYNC_EVENT,
  loadExtraChargesCatalog,
  saveExtraChargesCatalog,
} from "@/lib/admin/extra-charges-catalog-data";
import {
  fetchExtraChargesFromApi,
  saveExtraChargesToApi,
  shouldUseSharedExtraCharges,
} from "@/lib/admin/extra-charges-api";
import type {
  ExtraChargeCatalogItem,
  ExtraChargeCatalogItemInput,
} from "@/lib/admin/extra-charges-catalog-types";

export function useExtraChargesCatalog() {
  const [items, setItems] = useState<ExtraChargeCatalogItem[]>(DEFAULT_EXTRA_CHARGES_CATALOG);
  const [ready, setReady] = useState(true);
  const shared = shouldUseSharedExtraCharges();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        setItems(await fetchExtraChargesFromApi());
        setReady(true);
        return;
      } catch {
        // fall through
      }
    }
    setItems(loadExtraChargesCatalog());
    setReady(true);
  }, [shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-extra-charges-catalog") void refresh();
    }
    window.addEventListener(EXTRA_CHARGES_CATALOG_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EXTRA_CHARGES_CATALOG_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function persist(next: ExtraChargeCatalogItem[]) {
    if (shared) {
      try {
        const saved = await saveExtraChargesToApi(next);
        setItems(saved);
        window.dispatchEvent(new Event(EXTRA_CHARGES_CATALOG_SYNC_EVENT));
        return;
      } catch {
        // fall through
      }
    }
    saveExtraChargesCatalog(next);
    setItems(next);
  }

  return {
    ready,
    items,
    enabledItems: items.filter((i) => i.enabled),
    addItem: (input: ExtraChargeCatalogItemInput) => {
      void persist([...items, createCatalogItem(input)]);
    },
    updateItem: (id: string, patch: Partial<ExtraChargeCatalogItemInput>) => {
      void persist(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    removeItem: (id: string) => {
      void persist(items.filter((item) => item.id !== id));
    },
    resetDefaults: () => {
      void persist(DEFAULT_EXTRA_CHARGES_CATALOG);
    },
  };
}
