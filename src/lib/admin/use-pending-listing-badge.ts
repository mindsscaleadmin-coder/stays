"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LISTINGS_SYNC_EVENT,
  getPendingCount,
  isSharedListingsEnabled,
} from "@/lib/listings/submission-data";

async function fetchPendingCount(): Promise<number> {
  if (!isSharedListingsEnabled()) {
    return getPendingCount();
  }
  try {
    const res = await fetch("/api/listings?status=pending&page=1&perPage=1", {
      cache: "no-store",
    });
    if (!res.ok) return getPendingCount();
    const data = (await res.json()) as {
      listings?: { status?: string }[];
      total?: number;
    };
    if (typeof data.total === "number") return data.total;
    return (data.listings ?? []).filter((l) => l.status === "pending").length;
  } catch {
    return getPendingCount();
  }
}

/**
 * Pending-listing count for the admin Listing Control nav badge.
 * Fetches the shared API directly so the badge does not depend on provider timing.
 */
export function usePendingListingBadgeCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    void fetchPendingCount().then(setCount);
  }, []);

  useEffect(() => {
    refresh();

    function onStorage(e: StorageEvent) {
      if (
        e.key === "farm-stays-listing-submissions" ||
        e.key === "farm-stays-deleted-listing-ids"
      ) {
        refresh();
      }
    }

    window.addEventListener(LISTINGS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);

    return () => {
      window.removeEventListener(LISTINGS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(poll);
    };
  }, [refresh]);

  return count;
}
