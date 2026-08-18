"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_ADDONS_SYNC_EVENT,
  loadHostAddons,
  newActivityId,
  newProductId,
  saveHostAddons,
} from "./host-addons-data";
import {
  fetchHostAddonsFromApi,
  saveHostAddonsViaApi,
  shouldUseSharedHostAddons,
} from "./host-addons-api";
import type { FarmActivity, FarmProduct, HostAddonsData } from "./host-addons-types";

export function useHostAddons(hostId: string | undefined) {
  const [data, setData] = useState<HostAddonsData | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedHostAddons();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        setData(await fetchHostAddonsFromApi(hostId));
        setReady(true);
        return;
      } catch {
        // fall through
      }
    }

    setData(loadHostAddons(hostId));
    setReady(true);
  }, [hostId, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-addons") void refresh();
    }
    window.addEventListener(HOST_ADDONS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_ADDONS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function persist(next: HostAddonsData) {
    if (shared) {
      try {
        const saved = await saveHostAddonsViaApi(next);
        setData(saved);
        window.dispatchEvent(new Event(HOST_ADDONS_SYNC_EVENT));
        return saved;
      } catch {
        // fall through
      }
    }
    saveHostAddons(next);
    setData(next);
    return next;
  }

  return {
    ready,
    data,
    toggleActivity: (id: string) => {
      if (!data) return;
      void persist({
        ...data,
        activities: data.activities.map((a) =>
          a.id === id ? { ...a, enabled: !a.enabled } : a
        ),
      });
    },
    toggleProductStock: (id: string) => {
      if (!data) return;
      void persist({
        ...data,
        products: data.products.map((p) =>
          p.id === id ? { ...p, inStock: !p.inStock } : p
        ),
      });
    },
    addActivity: (input: Omit<FarmActivity, "id">) => {
      if (!data) return null;
      return persist({
        ...data,
        activities: [...data.activities, { ...input, id: newActivityId() }],
      });
    },
    addProduct: (input: Omit<FarmProduct, "id">) => {
      if (!data) return null;
      return persist({
        ...data,
        products: [...data.products, { ...input, id: newProductId() }],
      });
    },
  };
}
