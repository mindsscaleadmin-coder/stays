"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminClearNoShow,
  adminForceCancelBooking,
  adminForceRefundBooking,
  adminMarkNoShow,
  adminOpenDispute,
  adminResolveDispute,
  adminUpdateDisputeNotes,
  getHostBookingRecord,
  HOST_BOOKINGS_SYNC_EVENT,
  loadHostBookings,
} from "@/lib/host/host-booking-data";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import {
  computeHostBookingMetrics,
  resolveBookingHost,
  type HostBookingMetrics,
} from "@/lib/admin/booking-oversight-utils";

export function useAdminBookings(bookingId?: string) {
  const [bookings, setBookings] = useState<HostBookingRecord[]>([]);
  const [booking, setBooking] = useState<HostBookingRecord | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const all = loadHostBookings().map(resolveBookingHost);
    setBookings(all);
    if (bookingId) {
      const found = getHostBookingRecord(bookingId);
      setBooking(found ? resolveBookingHost(found) : null);
    } else {
      setBooking(null);
    }
    setReady(true);
  }, [bookingId]);

  useEffect(() => {
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-bookings") refresh();
    }
    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const hostMetrics = useMemo<HostBookingMetrics[]>(
    () => computeHostBookingMetrics(bookings),
    [bookings]
  );

  const openDisputeCount = useMemo(
    () => bookings.filter((b) => b.disputeStatus === "open").length,
    [bookings]
  );

  const noShowCount = useMemo(() => bookings.filter((b) => b.noShow).length, [bookings]);

  return {
    ready,
    bookings,
    booking,
    hostMetrics,
    openDisputeCount,
    noShowCount,
    refresh,
    forceCancel: (id: string, reason: string, actor = "Admin") => {
      const saved = adminForceCancelBooking(id, { reason, actor });
      refresh();
      return saved;
    },
    forceRefund: (id: string, amount: string, reason: string, actor = "Admin") => {
      const saved = adminForceRefundBooking(id, { amount, reason, actor });
      refresh();
      return saved;
    },
    openDispute: (id: string, summary: string, guestClaim?: string, actor = "Admin") => {
      const saved = adminOpenDispute(id, { summary, guestClaim, actor });
      refresh();
      return saved;
    },
    resolveDispute: (id: string, resolution: string, actor = "Admin") => {
      const saved = adminResolveDispute(id, { resolution, actor });
      refresh();
      return saved;
    },
    updateDisputeNotes: (
      id: string,
      input: { hostResponse?: string; guestClaim?: string },
      actor = "Admin"
    ) => {
      const saved = adminUpdateDisputeNotes(id, { ...input, actor });
      refresh();
      return saved;
    },
    markNoShow: (id: string, note?: string, actor = "Admin") => {
      const saved = adminMarkNoShow(id, { note, actor });
      refresh();
      return saved;
    },
    clearNoShow: (id: string, actor = "Admin") => {
      const saved = adminClearNoShow(id, actor);
      refresh();
      return saved;
    },
  };
}
