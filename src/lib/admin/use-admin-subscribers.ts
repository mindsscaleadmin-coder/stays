"use client";

import { useCallback, useEffect, useState } from "react";
import { HOST_PROFILES_SYNC_EVENT } from "@/lib/host/host-profile-data";
import type { AdminSubscriberFilter, AdminSubscriberRow } from "@/lib/server/admin-subscribers-repo";

export function useAdminSubscribers(filter: AdminSubscriberFilter = "all", search = "") {
  const [rows, setRows] = useState<AdminSubscriberRow[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyHostId, setBusyHostId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReady(false);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("filter", filter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/subscribers?${params.toString()}`);
      if (!res.ok) {
        setError("Could not load subscribers.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as { subscribers?: AdminSubscriberRow[] };
      setRows(Array.isArray(data.subscribers) ? data.subscribers : []);
    } catch {
      setError("Could not load subscribers.");
      setRows([]);
    } finally {
      setReady(true);
    }
  }, [filter, search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onSync() {
      void refresh();
    }
    window.addEventListener(HOST_PROFILES_SYNC_EVENT, onSync);
    return () => window.removeEventListener(HOST_PROFILES_SYNC_EVENT, onSync);
  }, [refresh]);

  const patchSubscriber = useCallback(
    async (
      hostId: string,
      action: string,
      extra?: { notes?: string; planId?: string; graceDays?: number }
    ) => {
      setBusyHostId(hostId);
      try {
        const res = await fetch("/api/admin/subscribers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostId, action, ...extra }),
        });
        if (!res.ok) {
          throw new Error("Request failed");
        }
        window.dispatchEvent(new Event(HOST_PROFILES_SYNC_EVENT));
        await refresh();
        return true;
      } catch {
        return false;
      } finally {
        setBusyHostId(null);
      }
    },
    [refresh]
  );

  return { rows, ready, error, busyHostId, refresh, patchSubscriber };
}
