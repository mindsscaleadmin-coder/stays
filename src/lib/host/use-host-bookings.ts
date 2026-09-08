"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_BOOKINGS_SYNC_EVENT,
  cancelHostBooking,
  getHostBookingRecord,
  loadHostBookings,
  previewCancelRefund,
  saveHostBookings,
  updateHostBookingRecord,
} from "./host-booking-data";
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
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        data,
        error: typeof data.error === "string" ? data.error : "Request failed",
      };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

const HOST_BOOKINGS_PULL_TTL_MS = 8_000;
const hostBookingsPull = new Map<
  string,
  { rows: HostBookingRecord[] | null; at: number; inflight?: Promise<HostBookingRecord[] | null> }
>();

async function fetchServerHostBookings(
  hostId?: string,
  force = false
): Promise<HostBookingRecord[] | null> {
  const key = hostId || "*";
  const cached = hostBookingsPull.get(key);
  if (!force && cached?.inflight) return cached.inflight;
  if (!force && cached && Date.now() - cached.at < HOST_BOOKINGS_PULL_TTL_MS) {
    return cached.rows;
  }

  const inflight = (async () => {
    try {
      const params = new URLSearchParams({ role: "host" });
      if (hostId) params.set("hostId", hostId);
      const res = await fetch(`/api/bookings?${params.toString()}`);
      if (!res.ok) return cached?.rows ?? null;
      const data = (await res.json()) as { bookings?: HostBookingRecord[] };
      const rows = Array.isArray(data.bookings) ? data.bookings : null;
      hostBookingsPull.set(key, { rows, at: Date.now() });
      return rows;
    } catch {
      return cached?.rows ?? null;
    }
  })();

  hostBookingsPull.set(key, {
    rows: cached?.rows ?? null,
    at: cached?.at ?? 0,
    inflight,
  });
  return inflight;
}

export function useHostBookings(bookingId?: string) {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const [bookings, setBookings] = useState<HostBookingRecord[]>([]);
  const [booking, setBooking] = useState<HostBookingRecord | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      const server = await fetchServerHostBookings(hostId, opts?.force);
      const all =
        server !== null
          ? server
          : loadHostBookings().filter((row) => !row.id.startsWith("GF-"));
      if (server !== null) {
        saveHostBookings(server, { silent: true });
      }
      setBookings(all);
      setBooking(
        bookingId
          ? all.find((b) => b.id === bookingId) ?? getHostBookingRecord(bookingId) ?? null
          : null
      );
      setReady(true);
    },
    [bookingId, hostId]
  );

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-bookings") {
        void refresh();
      }
    }
    function onSync() {
      void refresh();
    }
    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, onSync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    bookings,
    booking,
    refresh,
    previewCancelRefund,
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
        const result = await tryServer(`/api/bookings/${id}/cancel`, {
          method: "POST",
          body: JSON.stringify({
            reason: input.reason,
            actor: "host",
            forceFullRefund: true,
          }),
        });
        if (!result.ok) throw new Error(result.error || "Could not cancel booking");
        await refresh({ force: true });
        return getHostBookingRecord(id);
      }
      const currency =
        existing?.currency || existing?.total.match(/^([A-Z]{3})\b/)?.[1] || "AED";
      const saved = cancelHostBooking(id, {
        reason: input.reason,
        refundStatus:
          input.refundStatus ||
          (preview ? refundStatusFromBand(preview.band) : "none"),
        refundAmount:
          input.refundAmount ||
          (preview && preview.refundAmount > 0
            ? `${currency} ${preview.refundAmount.toLocaleString()}`
            : undefined),
      });
      await refresh({ force: true });
      return saved;
    },
    checkIn: async (id: string) => {
      if (looksLikeServerBooking(id)) {
        const result = await tryServer(`/api/bookings/${id}/check-in`, { method: "POST" });
        if (!result.ok) throw new Error(result.error || "Could not check in guest");
        await refresh({ force: true });
        return getHostBookingRecord(id);
      }
      throw new Error("This booking is not on the server calendar.");
    },
    checkOut: async (id: string) => {
      if (looksLikeServerBooking(id)) {
        const result = await tryServer(`/api/bookings/${id}/checkout`, { method: "POST" });
        if (!result.ok) throw new Error(result.error || "Could not check out guest");
        await refresh({ force: true });
        return getHostBookingRecord(id);
      }
      throw new Error("This booking is not on the server calendar.");
    },
    update: async (id: string, updates: HostBookingUpdate) => {
      if (looksLikeServerBooking(id)) {
        if (updates.refundStatus && updates.refundStatus !== "none") {
          const result = await tryServer(`/api/bookings/${id}/refund`, {
            method: "POST",
            body: JSON.stringify({
              completePending: updates.refundStatus === "full" || updates.refundStatus === "partial",
              reason: "Host marked refund complete",
            }),
          });
          if (!result.ok) throw new Error(result.error || "Could not update refund");
        }
        if (updates.noShow !== undefined) {
          const result = await tryServer(`/api/bookings/${id}/no-show`, {
            method: "POST",
            body: JSON.stringify({ noShow: updates.noShow }),
          });
          if (!result.ok) throw new Error(result.error || "Could not update no-show");
        }
        await refresh({ force: true });
        return getHostBookingRecord(id);
      }
      const saved = updateHostBookingRecord(id, updates);
      void refresh({ force: true });
      return saved;
    },
  };
}
