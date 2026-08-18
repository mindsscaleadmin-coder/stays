"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_BOOKINGS_SYNC_EVENT,
  acceptHostBooking,
  cancelHostBooking,
  declineHostBooking,
  getHostBookingRecord,
  getHostInstantBookEnabled,
  loadHostBookings,
  markHostBookingCheckedIn,
  markHostBookingCheckedOut,
  mergeServerHostBookings,
  previewCancelRefund,
  setHostInstantBookEnabled,
  updateHostBookingRecord,
} from "./host-booking-data";
import { PLATFORM_CONFIG_SYNC_EVENT } from "@/lib/admin/platform-config-data";
import type { HostBookingRecord, HostBookingUpdate } from "./host-booking-types";
import { refundStatusFromBand } from "@/lib/booking/policies";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/host-listings-utils";

/** Prisma cuid-style ids from checkout; seed demos use GF-… */
function looksLikeServerBooking(id: string): boolean {
  return !id.startsWith("GF-") && id.length >= 20;
}

async function tryServer(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false };
  }
}

async function fetchServerHostBookings(
  hostId?: string
): Promise<HostBookingRecord[] | null> {
  try {
    const params = new URLSearchParams({ role: "host" });
    if (hostId) params.set("hostId", hostId);
    const res = await fetch(`/api/bookings?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { bookings?: HostBookingRecord[] };
    return Array.isArray(data.bookings) ? data.bookings : null;
  } catch {
    return null;
  }
}

export function useHostBookings(bookingId?: string) {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const [bookings, setBookings] = useState<HostBookingRecord[]>([]);
  const [booking, setBooking] = useState<HostBookingRecord | null>(null);
  const [instantBookEnabled, setInstantBookEnabledState] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const server = await fetchServerHostBookings(hostId);
    const all =
      server !== null
        ? mergeServerHostBookings(server, { serverPrimary: true })
        : loadHostBookings();
    setBookings(all);
    setBooking(
      bookingId
        ? all.find((b) => b.id === bookingId) ?? getHostBookingRecord(bookingId) ?? null
        : null
    );
    setInstantBookEnabledState(getHostInstantBookEnabled());
    setReady(true);
  }, [bookingId, hostId]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (
        e.key === "farm-stays-host-bookings" ||
        e.key === "farm-stays-host-instant-book-enabled" ||
        e.key === "farm-stays-platform-config"
      ) {
        void refresh();
      }
    }
    function onSync() {
      void refresh();
    }
    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, onSync);
    window.addEventListener(PLATFORM_CONFIG_SYNC_EVENT, onSync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, onSync);
      window.removeEventListener(PLATFORM_CONFIG_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    bookings,
    booking,
    instantBookEnabled,
    pendingCount: bookings.filter((b) => b.status === "pending").length,
    refresh,
    previewCancelRefund,
    setInstantBookEnabled: (enabled: boolean) => {
      setHostInstantBookEnabled(enabled);
      void refresh();
    },
    accept: async (id: string) => {
      if (looksLikeServerBooking(id)) {
        await tryServer(`/api/bookings/${id}/accept`, { method: "POST" });
      }
      const saved = acceptHostBooking(id);
      await refresh();
      return saved;
    },
    decline: async (id: string) => {
      if (looksLikeServerBooking(id)) {
        await tryServer(`/api/bookings/${id}/decline`, {
          method: "POST",
          body: JSON.stringify({ reason: "Host declined the request" }),
        });
      }
      const saved = declineHostBooking(id);
      await refresh();
      return saved;
    },
    cancel: async (
      id: string,
      input: {
        reason: string;
        refundStatus: HostBookingRecord["refundStatus"];
        refundAmount?: string;
      }
    ) => {
      const existing = getHostBookingRecord(id);
      const preview = existing ? previewCancelRefund(existing, "host") : null;
      if (looksLikeServerBooking(id)) {
        await tryServer(`/api/bookings/${id}/cancel`, {
          method: "POST",
          body: JSON.stringify({
            reason: input.reason,
            actor: "host",
            forceFullRefund: true,
          }),
        });
      }
      const saved = cancelHostBooking(id, {
        reason: input.reason,
        refundStatus:
          input.refundStatus ||
          (preview ? refundStatusFromBand(preview.band) : "none"),
        refundAmount:
          input.refundAmount ||
          (preview && preview.refundAmount > 0
            ? `AED ${preview.refundAmount.toLocaleString()}`
            : undefined),
      });
      await refresh();
      return saved;
    },
    checkIn: (id: string) => {
      const saved = markHostBookingCheckedIn(id);
      void refresh();
      return saved;
    },
    checkOut: (id: string) => {
      const saved = markHostBookingCheckedOut(id);
      void refresh();
      return saved;
    },
    update: (id: string, updates: HostBookingUpdate) => {
      const saved = updateHostBookingRecord(id, updates);
      void refresh();
      return saved;
    },
  };
}
