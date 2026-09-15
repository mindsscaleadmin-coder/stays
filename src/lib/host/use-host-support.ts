"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_SUPPORT_SYNC_EVENT,
  createSupportTicket,
  loadHostSupport,
} from "./host-support-data";
import { SUPPORT_TICKETS_SYNC_EVENT } from "@/lib/admin/support-data";
import type { HostSupportData } from "./host-support-types";
import {
  createHostSupportTicketViaApi,
  fetchHostSupportFromApi,
  shouldUseSharedHostSupport,
} from "./host-support-api";

export function useHostSupport(hostId: string | undefined, hostName?: string) {
  const shared = shouldUseSharedHostSupport();
  const [data, setData] = useState<HostSupportData | null>(() =>
    hostId ? loadHostSupport(hostId) : null
  );
  const [ready, setReady] = useState(true);

  const refresh = useCallback(() => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }
    if (shared) {
      void fetchHostSupportFromApi(hostId)
        .then((tickets) => setData({ hostId, tickets }))
        .catch(() => setData(loadHostSupport(hostId)));
    } else {
      setData(loadHostSupport(hostId));
    }
    setReady(true);
  }, [hostId, shared]);

  useEffect(() => {
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-support-tickets") refresh();
    }
    window.addEventListener(HOST_SUPPORT_SYNC_EVENT, refresh);
    window.addEventListener(SUPPORT_TICKETS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_SUPPORT_SYNC_EVENT, refresh);
      window.removeEventListener(SUPPORT_TICKETS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    data,
    submitTicket: (subject: string, message: string) => {
      if (!hostId) return null;
      if (shared) {
        void createHostSupportTicketViaApi(hostId, { subject, message, hostName })
          .then((tickets) => setData({ hostId, tickets }))
          .catch(() => {
            const next = createSupportTicket(hostId, subject, message, hostName);
            setData(next);
          });
        return data;
      }
      const next = createSupportTicket(hostId, subject, message, hostName);
      setData(next);
      return next;
    },
  };
}
