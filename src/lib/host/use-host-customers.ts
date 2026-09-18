"use client";

import { useCallback, useEffect, useState } from "react";
import type { HostCustomersPage } from "@/lib/host/host-customers-types";

const CUSTOMERS_TTL_MS = 8_000;

const customersCache = new Map<
  string,
  { data: HostCustomersPage | null; at: number; inflight?: Promise<HostCustomersPage | null> }
>();

export function useHostCustomers(
  hostId: string | undefined,
  options?: { page?: number; q?: string }
) {
  const page = options?.page ?? 1;
  const q = options?.q?.trim() ?? "";
  const cacheKey = `${hostId || ""}:${page}:${q}`;

  const [data, setData] = useState<HostCustomersPage | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      if (!hostId) {
        setData(null);
        setReady(true);
        return;
      }

      const cached = customersCache.get(cacheKey);
      if (!force && cached?.inflight) {
        const rows = await cached.inflight;
        setData(rows);
        setReady(true);
        return;
      }
      if (!force && cached && Date.now() - cached.at < CUSTOMERS_TTL_MS) {
        setData(cached.data);
        setReady(true);
        return;
      }

      const inflight = (async () => {
        try {
          const params = new URLSearchParams({
            page: String(page),
            pageSize: "50",
          });
          if (q) params.set("q", q);
          const res = await fetch(
            `/api/hosts/${encodeURIComponent(hostId)}/customers?${params.toString()}`
          );
          if (!res.ok) return cached?.data ?? null;
          const payload = (await res.json()) as HostCustomersPage;
          customersCache.set(cacheKey, { data: payload, at: Date.now() });
          return payload;
        } catch {
          return cached?.data ?? null;
        }
      })();

      customersCache.set(cacheKey, {
        data: cached?.data ?? null,
        at: cached?.at ?? 0,
        inflight,
      });

      const rows = await inflight;
      setData(rows);
      setError(rows ? null : "Could not load customers.");
      setReady(true);
    },
    [hostId, cacheKey, page, q]
  );

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  return { data, ready, error, refresh };
}
