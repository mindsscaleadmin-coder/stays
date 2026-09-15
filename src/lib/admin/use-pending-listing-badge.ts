"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LISTINGS_SYNC_EVENT,
  getPendingCount,
  isSharedListingsEnabled,
} from "@/lib/listings/submission-data";

const PENDING_COUNT_TTL_MS = 30_000;
let pendingCountInflight: Promise<number> | null = null;
let pendingCountCached = 0;
let pendingCountAt = 0;

async function fetchPendingCount(): Promise<number> {
  if (!isSharedListingsEnabled()) {
    return getPendingCount();
  }
  if (pendingCountInflight) return pendingCountInflight;
  if (Date.now() - pendingCountAt < PENDING_COUNT_TTL_MS) {
    return pendingCountCached;
  }

  pendingCountInflight = (async () => {
    try {
      const res = await fetch("/api/listings?status=pending&page=1&perPage=1", {
        cache: "no-store",
      });
      if (!res.ok) return pendingCountCached || getPendingCount();
      const data = (await res.json()) as {
        listings?: { status?: string }[];
        total?: number;
      };
      const count =
        typeof data.total === "number"
          ? data.total
          : (data.listings ?? []).filter((l) => l.status === "pending").length;
      pendingCountCached = count;
      pendingCountAt = Date.now();
      return count;
    } catch {
      return pendingCountCached || getPendingCount();
    } finally {
      pendingCountInflight = null;
    }
  })();

  return pendingCountInflight;
}

/**
 * Pending-listing count for the admin Listing Control nav badge.
 * Fetches the shared API directly so the badge does not depend on provider timing.
 */
export function usePendingListingBadgeCount(): number | null {
  // null until mounted — avoids SSR/client localStorage mismatch inside sidebar links.
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback((opts?: { force?: boolean }) => {
    if (opts?.force) {
      pendingCountAt = 0;
    }
    void fetchPendingCount().then(setCount);
  }, []);

  useEffect(() => {
    setCount(getPendingCount());
    refresh();

    function onStorage(e: StorageEvent) {
      if (
        e.key === "farm-stays-listing-submissions" ||
        e.key === "farm-stays-deleted-listing-ids"
      ) {
        refresh();
      }
    }

    function onListingsSync() {
      refresh({ force: true });
    }
    window.addEventListener(LISTINGS_SYNC_EVENT, onListingsSync);
    window.addEventListener("storage", onStorage);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);

    return () => {
      window.removeEventListener(LISTINGS_SYNC_EVENT, onListingsSync);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(poll);
    };
  }, [refresh]);

  return count;
}
