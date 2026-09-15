"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExtraChargeBilling } from "@/lib/admin/extra-charges-catalog-types";
import {
  HOST_EXTRA_LIBRARY_SYNC_EVENT,
  addHostExtraTemplate,
  deleteHostExtraTemplate,
  loadHostExtraLibrary,
  updateHostExtraTemplate,
} from "./host-extra-charges-library-data";
import type { HostExtraChargeTemplate } from "./host-extra-charges-library-types";

export function useHostExtraLibrary(hostId?: string) {
  const [items, setItems] = useState<HostExtraChargeTemplate[]>(() =>
    hostId ? loadHostExtraLibrary(hostId) : []
  );
  const [ready, setReady] = useState(true);

  const refresh = useCallback(() => {
    if (!hostId) {
      setItems([]);
      setReady(true);
      return;
    }
    setItems(loadHostExtraLibrary(hostId));
    setReady(true);
  }, [hostId]);

  useEffect(() => {
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-extra-library") refresh();
    }
    window.addEventListener(HOST_EXTRA_LIBRARY_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_EXTRA_LIBRARY_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    items,
    refresh,
    add: (input: { label: string; amount: number; billing: ExtraChargeBilling }) => {
      if (!hostId) return null;
      const created = addHostExtraTemplate(hostId, input);
      refresh();
      return created;
    },
    update: (
      id: string,
      patch: Partial<Pick<HostExtraChargeTemplate, "label" | "amount" | "billing">>
    ) => {
      if (!hostId) return false;
      const ok = updateHostExtraTemplate(hostId, id, patch);
      refresh();
      return ok;
    },
    remove: (id: string) => {
      if (!hostId) return false;
      const ok = deleteHostExtraTemplate(hostId, id);
      refresh();
      return ok;
    },
  };
}
