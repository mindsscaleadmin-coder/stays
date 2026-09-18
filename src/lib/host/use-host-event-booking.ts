"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventAvailabilityRequest } from "@/lib/events/event-availability-types";
import { eventRequestToHostBookingRecord } from "@/lib/host/host-ops-adapter";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { resolveHostBookingCategory } from "@/lib/host/booking-category";

type EventBookingPayload = {
  request: EventAvailabilityRequest;
  booking: HostBookingRecord;
};

export function useHostEventBooking(requestId: string | undefined, hostId: string | undefined) {
  const [request, setRequest] = useState<EventAvailabilityRequest | null>(null);
  const [booking, setBooking] = useState<HostBookingRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!requestId || !hostId) {
      setRequest(null);
      setBooking(null);
      setReady(true);
      return;
    }

    try {
      const res = await fetch(`/api/event-requests/${encodeURIComponent(requestId)}`);
      if (res.status === 404) {
        setRequest(null);
        setBooking(null);
        setError(null);
        setReady(true);
        return;
      }
      if (!res.ok) {
        setError("Could not load this enquiry.");
        setReady(true);
        return;
      }
      const data = (await res.json()) as EventBookingPayload;
      setRequest(data.request ?? null);
      setBooking(data.booking ?? null);
      setError(null);
    } catch {
      setError("Could not load this enquiry.");
    } finally {
      setReady(true);
    }
  }, [requestId, hostId]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  return { request, booking, ready, error, refresh };
}

/** Local fallback when API is unavailable (demo listings). */
export function eventRequestFromLocal(
  request: EventAvailabilityRequest,
  listingPayload?: string
): HostBookingRecord {
  let parentCategory: string | undefined;
  let category: string | undefined;
  if (listingPayload) {
    try {
      const parsed = JSON.parse(listingPayload) as {
        parentCategory?: string;
        category?: string;
      };
      parentCategory = parsed.parentCategory;
      category = parsed.category;
    } catch {
      // ignore
    }
  }
  const hostCategory = resolveHostBookingCategory({
    parentCategory,
    category,
    payload: listingPayload,
  });
  return eventRequestToHostBookingRecord(request, hostCategory);
}
