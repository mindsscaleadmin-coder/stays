"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventAvailabilityRequest } from "@/lib/events/event-availability-types";
import {
  HOST_EVENT_REQUESTS_SYNC_EVENT,
  loadHostEventRequests,
} from "./host-event-requests-data";
import { fetchHostEventRequestsFromApi } from "./host-event-requests-api";

export function useHostEventRequests(hostId: string | undefined) {
  const [requests, setRequests] = useState<EventAvailabilityRequest[]>(() =>
    hostId ? loadHostEventRequests(hostId) : []
  );
  const [ready, setReady] = useState(true);

  const refresh = useCallback(
    async (force = false) => {
      if (!hostId) {
        setRequests([]);
        setReady(true);
        return;
      }

      try {
        const rows = await fetchHostEventRequestsFromApi(hostId, force);
        setRequests(rows);
      } catch {
        setRequests(loadHostEventRequests(hostId));
      } finally {
        setReady(true);
      }
    },
    [hostId]
  );

  useEffect(() => {
    void refresh();
    function onSync() {
      void refresh();
    }
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-event-requests") void refresh();
    }
    window.addEventListener(HOST_EVENT_REQUESTS_SYNC_EVENT, onSync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_EVENT_REQUESTS_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return { requests, ready, refresh };
}
