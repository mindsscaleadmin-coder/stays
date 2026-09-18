"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { HostGuestBookingSummary } from "@/lib/host/customer-history-types";
import { summarizeGuestBookings } from "@/lib/host/customer-history-utils";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";

function looksLikeServerBooking(id: string): boolean {
  return !id.startsWith("GF-") && id.length >= 20;
}

function rowsForGuest(
  allBookings: HostBookingRecord[],
  guestId?: string,
  guestEmail?: string,
  guestName?: string
) {
  return allBookings
    .filter((row) => {
      if (guestId && row.guestId) return row.guestId === guestId;
      if (guestEmail && row.guestEmail) {
        return row.guestEmail.toLowerCase() === guestEmail.toLowerCase();
      }
      if (guestName) return row.guest === guestName;
      return false;
    })
    .map((row) => ({
      id: row.id,
      bookingReference: row.bookingReference,
      property: row.property,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      status: row.status,
      bookedAt: row.bookedAt,
    }));
}

export function useHostGuestSummary(
  hostId: string | undefined,
  booking: HostBookingRecord | null | undefined,
  allBookings: HostBookingRecord[]
) {
  const guestId = booking?.guestId;
  const [summary, setSummary] = useState<HostGuestBookingSummary | null>(null);
  const [ready, setReady] = useState(false);

  const localSummary = useMemo(() => {
    if (!booking) return null;
    const rows = rowsForGuest(
      allBookings,
      guestId,
      booking.guestEmail,
      booking.guest
    );
    const id = guestId || `local-${booking.guestEmail || booking.guest}`;
    return summarizeGuestBookings(id, rows, booking.id);
  }, [allBookings, booking, guestId]);

  const refresh = useCallback(async () => {
    if (!hostId || !booking) {
      setSummary(null);
      setReady(true);
      return;
    }

    if (!guestId || !looksLikeServerBooking(booking.id)) {
      setSummary(localSummary);
      setReady(true);
      return;
    }

    try {
      const params = new URLSearchParams({ bookingId: booking.id });
      const res = await fetch(
        `/api/hosts/${encodeURIComponent(hostId)}/customers/${encodeURIComponent(guestId)}/summary?${params}`
      );
      if (!res.ok) {
        setSummary(localSummary);
        setReady(true);
        return;
      }
      const data = (await res.json()) as { summary?: HostGuestBookingSummary };
      setSummary(data.summary ?? localSummary);
    } catch {
      setSummary(localSummary);
    } finally {
      setReady(true);
    }
  }, [hostId, booking, guestId, localSummary]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  return { summary: summary ?? localSummary, ready, refresh };
}
