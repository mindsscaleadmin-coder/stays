"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  HostBookingOpsRecord,
  HostBookingOpsUpsertInput,
  HostOpsSourceType,
} from "@/lib/host/host-ops-types";
import {
  loadLocalBookingOps,
  saveLocalBookingOps,
} from "@/lib/host/host-booking-ops-data";

export type BookingOpsView = {
  ops: HostBookingOpsRecord | null;
  assignedStaffName: string | null;
};

function looksLikeServerBooking(id: string): boolean {
  return !id.startsWith("GF-") && id.length >= 20;
}

function opsApiPath(sourceType: HostOpsSourceType, sourceId: string): string {
  if (sourceType === "event_request") {
    return `/api/host-ops/event/${encodeURIComponent(sourceId)}`;
  }
  return `/api/host-ops/booking/${encodeURIComponent(sourceId)}`;
}

export function useHostOps(
  sourceType: HostOpsSourceType,
  sourceId: string | undefined,
  hostId: string | undefined
) {
  const [view, setView] = useState<BookingOpsView>({ ops: null, assignedStaffName: null });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sourceId || !hostId) {
      setView({ ops: null, assignedStaffName: null });
      setReady(true);
      return;
    }

    if (sourceType === "booking" && !looksLikeServerBooking(sourceId)) {
      const local = loadLocalBookingOps(hostId, sourceId);
      setView({ ops: local, assignedStaffName: null });
      setReady(true);
      return;
    }

    try {
      const res = await fetch(opsApiPath(sourceType, sourceId));
      if (res.status === 404) {
        setView({ ops: null, assignedStaffName: null });
        setReady(true);
        return;
      }
      if (!res.ok) {
        setError("Could not load booking operations.");
        setReady(true);
        return;
      }
      const data = (await res.json()) as BookingOpsView;
      setView({
        ops: data.ops ?? null,
        assignedStaffName: data.assignedStaffName ?? null,
      });
      setError(null);
    } catch {
      setError("Could not load booking operations.");
    } finally {
      setReady(true);
    }
  }, [sourceId, sourceType, hostId]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  const patch = useCallback(
    async (input: HostBookingOpsUpsertInput) => {
      if (!sourceId || !hostId) return null;
      setSaving(true);
      setError(null);

      try {
        if (sourceType === "booking" && !looksLikeServerBooking(sourceId)) {
          const ops = saveLocalBookingOps(hostId, sourceId, input);
          setView((prev) => ({ ...prev, ops }));
          return ops;
        }

        const res = await fetch(opsApiPath(sourceType, sourceId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          ops?: HostBookingOpsRecord;
          assignedStaffName?: string | null;
        };
        if (!res.ok) {
          throw new Error(data.error || "Could not save.");
        }
        setView({
          ops: data.ops ?? null,
          assignedStaffName: data.assignedStaffName ?? null,
        });
        return data.ops ?? null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [sourceId, sourceType, hostId]
  );

  return { view, ready, saving, error, patch, refresh };
}

export function useBookingOps(bookingId: string | undefined, hostId: string | undefined) {
  return useHostOps("booking", bookingId, hostId);
}
