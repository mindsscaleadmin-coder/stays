"use client";

import { useCallback, useEffect, useState } from "react";
import { FINANCIAL_SYNC_EVENT, loadFinancialSettings } from "@/lib/admin/financial-data";
import {
  fetchFinancialSettingsFromApi,
  shouldUseSharedAdminFinancial,
} from "@/lib/admin/financial-api";

const REFUND_COUNT_TTL_MS = 30_000;
let refundCountCached = 0;
let refundCountAt = 0;
let refundCountInflight: Promise<number> | null = null;

function countPendingRefunds(): number {
  return loadFinancialSettings().refundRequests.filter((r) => r.status === "pending").length;
}

async function fetchPendingRefundCount(): Promise<number> {
  if (!shouldUseSharedAdminFinancial()) {
    return countPendingRefunds();
  }
  if (refundCountInflight) return refundCountInflight;
  if (Date.now() - refundCountAt < REFUND_COUNT_TTL_MS) {
    return refundCountCached;
  }

  refundCountInflight = (async () => {
    try {
      const payload = await fetchFinancialSettingsFromApi();
      const count = (payload.ledger?.refunds ?? payload.settings.refundRequests).filter(
        (r) => r.status === "pending"
      ).length;
      refundCountCached = count;
      refundCountAt = Date.now();
      return count;
    } catch {
      return refundCountCached || countPendingRefunds();
    } finally {
      refundCountInflight = null;
    }
  })();

  return refundCountInflight;
}

/** Pending refund count for the admin Financial nav badge. */
export function usePendingRefundBadgeCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback((opts?: { force?: boolean }) => {
    if (opts?.force) refundCountAt = 0;
    void fetchPendingRefundCount().then(setCount);
  }, []);

  useEffect(() => {
    const schedule =
      typeof requestIdleCallback !== "undefined"
        ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2000 })
        : (cb: () => void) => window.setTimeout(cb, 0);
    const cancelSchedule =
      typeof cancelIdleCallback !== "undefined"
        ? (id: number) => cancelIdleCallback(id)
        : (id: number) => window.clearTimeout(id);

    const idleId = schedule(() => {
      setCount(countPendingRefunds());
      refresh();
    });

    function onSync() {
      refresh({ force: true });
    }

    window.addEventListener(FINANCIAL_SYNC_EVENT, onSync);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);

    return () => {
      cancelSchedule(idleId);
      window.removeEventListener(FINANCIAL_SYNC_EVENT, onSync);
      window.clearInterval(poll);
    };
  }, [refresh]);

  return count;
}
