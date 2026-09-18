"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GUEST_SUPPORT_SYNC_EVENT,
  createGuestSupportTicket,
  loadGuestSupport,
} from "./guest-support-data";
import { SUPPORT_TICKETS_SYNC_EVENT } from "@/lib/admin/support-data";
import type { GuestSupportData } from "./guest-support-types";
import {
  createGuestSupportTicketViaApi,
  fetchGuestSupportFromApi,
  shouldUseSharedGuestSupport,
} from "./guest-support-api";

export function useGuestSupport(
  guestId: string | undefined,
  guestProfile?: { guestName?: string; guestEmail?: string }
) {
  const shared = shouldUseSharedGuestSupport();
  const [data, setData] = useState<GuestSupportData | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    if (!guestId) {
      setData(null);
      setReady(true);
      return;
    }
    if (shared) {
      void fetchGuestSupportFromApi(guestId)
        .then((tickets) => setData({ guestId, tickets }))
        .catch((error) => {
          console.error(error);
          setData({ guestId, tickets: [] });
        });
    } else {
      setData(loadGuestSupport(guestId));
    }
    setReady(true);
  }, [guestId, shared]);

  useEffect(() => {
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-support-tickets" || e.key === "farm-stays-guest-support") {
        refresh();
      }
    }
    window.addEventListener(GUEST_SUPPORT_SYNC_EVENT, refresh);
    window.addEventListener(SUPPORT_TICKETS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(GUEST_SUPPORT_SYNC_EVENT, refresh);
      window.removeEventListener(SUPPORT_TICKETS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    data,
    submitTicket: (input: {
      subject: string;
      message: string;
      bookingRef?: string;
      property?: string;
    }) => {
      if (!guestId) return null;
      if (shared) {
        void createGuestSupportTicketViaApi(guestId, {
          ...input,
          guestName: guestProfile?.guestName,
          guestEmail: guestProfile?.guestEmail,
        })
          .then((tickets) => setData({ guestId, tickets }))
          .catch((error) => {
            console.error(error);
          });
        return data;
      }
      const next = createGuestSupportTicket({
        guestId,
        guestName: guestProfile?.guestName ?? guestId,
        guestEmail: guestProfile?.guestEmail,
        ...input,
      });
      setData(next);
      return next;
    },
  };
}
