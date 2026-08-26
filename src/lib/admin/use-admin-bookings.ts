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
import { isSharedDbEnabled } from "@/lib/shared-db";

let bookingsInflight: Promise<HostBookingRecord[] | null> | null = null;
let bookingsCached: HostBookingRecord[] | null = null;
let bookingsFetchedAt = 0;

async function fetchServerBookings(): Promise<HostBookingRecord[] | null> {
  if (bookingsInflight) return bookingsInflight;
  if (bookingsCached && Date.now() - bookingsFetchedAt < 8_000) return bookingsCached;
  bookingsInflight = (async () => {
    try {
      const res = await fetch("/api/bookings?role=host", { cache: "no-store" });
      if (!res.ok) return bookingsCached;
      const data = (await res.json()) as { bookings?: HostBookingRecord[] };
      const rows = Array.isArray(data.bookings) ? data.bookings : null;
      if (rows) {
        bookingsCached = rows;
        bookingsFetchedAt = Date.now();
      }
      return rows;
    } catch {
      return bookingsCached;
    } finally {
      bookingsInflight = null;
    }
  })();
  return bookingsInflight;
}

async function postBooking(path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useAdminBookings(bookingId?: string) {
  const [bookings, setBookings] = useState<HostBookingRecord[]>([]);
  const [booking, setBooking] = useState<HostBookingRecord | null>(null);
  const [ready, setReady] = useState(false);
  const shared = isSharedDbEnabled();

  const refresh = useCallback(async () => {
    const server = await fetchServerBookings();
    const all = (server ?? loadHostBookings()).map(resolveBookingHost);
    setBookings(all);
    if (bookingId) {
      const found = all.find((row) => row.id === bookingId) ?? getHostBookingRecord(bookingId);
      setBooking(found ? resolveBookingHost(found) : null);
    } else {
      setBooking(null);
    }
    setReady(true);
  }, [bookingId]);

  const refreshLocal = useCallback(() => {
    const all = loadHostBookings().map(resolveBookingHost);
    setBookings(all);
    if (bookingId) {
      const found = all.find((row) => row.id === bookingId) ?? getHostBookingRecord(bookingId);
      setBooking(found ? resolveBookingHost(found) : null);
    } else {
      setBooking(null);
    }
    setReady(true);
  }, [bookingId]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-bookings") refreshLocal();
    }
    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, refreshLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, refreshLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh, refreshLocal]);

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
    forceCancel: async (id: string, reason: string, actor = "Admin") => {
      if (shared) {
        const ok = await postBooking(`/api/bookings/${id}/cancel`, {
          reason,
          actor: "admin",
          forceFullRefund: true,
        });
        if (ok) {
          await refresh();
          return getHostBookingRecord(id);
        }
      }
      const saved = adminForceCancelBooking(id, { reason, actor });
      await refresh();
      return saved;
    },
    forceRefund: async (id: string, amount: string, reason: string, actor = "Admin") => {
      if (shared) {
        const ok = await postBooking(`/api/bookings/${id}/refund`, { amount, reason });
        if (ok) {
          await refresh();
          return getHostBookingRecord(id);
        }
      }
      const saved = adminForceRefundBooking(id, { amount, reason, actor });
      await refresh();
      return saved;
    },
    openDispute: async (id: string, summary: string, guestClaim?: string, actor = "Admin") => {
      if (shared) {
        const ok = await postBooking(`/api/bookings/${id}/dispute`, {
          action: "open",
          summary,
          guestClaim,
        });
        if (ok) {
          await refresh();
          return getHostBookingRecord(id);
        }
      }
      const saved = adminOpenDispute(id, { summary, guestClaim, actor });
      await refresh();
      return saved;
    },
    resolveDispute: async (id: string, resolution: string, actor = "Admin") => {
      if (shared) {
        const ok = await postBooking(`/api/bookings/${id}/dispute`, {
          action: "resolve",
          resolution,
        });
        if (ok) {
          await refresh();
          return getHostBookingRecord(id);
        }
      }
      const saved = adminResolveDispute(id, { resolution, actor });
      await refresh();
      return saved;
    },
    updateDisputeNotes: async (
      id: string,
      input: { hostResponse?: string; guestClaim?: string },
      actor = "Admin"
    ) => {
      if (shared) {
        const ok = await postBooking(`/api/bookings/${id}/dispute`, {
          action: "notes",
          ...input,
        });
        if (ok) {
          await refresh();
          return getHostBookingRecord(id);
        }
      }
      const saved = adminUpdateDisputeNotes(id, { ...input, actor });
      await refresh();
      return saved;
    },
    markNoShow: async (id: string, note?: string, actor = "Admin") => {
      if (shared) {
        const ok = await postBooking(`/api/bookings/${id}/no-show`, { noShow: true, note });
        if (ok) {
          await refresh();
          return getHostBookingRecord(id);
        }
      }
      const saved = adminMarkNoShow(id, { note, actor });
      await refresh();
      return saved;
    },
    clearNoShow: async (id: string, actor = "Admin") => {
      if (shared) {
        const ok = await postBooking(`/api/bookings/${id}/no-show`, { noShow: false });
        if (ok) {
          await refresh();
          return getHostBookingRecord(id);
        }
      }
      const saved = adminClearNoShow(id, actor);
      await refresh();
      return saved;
    },
  };
}
