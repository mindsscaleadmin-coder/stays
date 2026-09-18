"use client";

import { useCallback, useEffect, useState } from "react";
import type { HostMessagesInboxPage } from "@/lib/host/host-messages-types";

const MESSAGES_TTL_MS = 8_000;

const messagesCache = new Map<
  string,
  { data: HostMessagesInboxPage | null; at: number; inflight?: Promise<HostMessagesInboxPage | null> }
>();

export function useHostMessages(hostId: string | undefined, page = 1) {
  const cacheKey = `${hostId || ""}:${page}`;

  const [data, setData] = useState<HostMessagesInboxPage | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      if (!hostId) {
        setData(null);
        setReady(true);
        return;
      }

      const cached = messagesCache.get(cacheKey);
      if (!force && cached?.inflight) {
        const rows = await cached.inflight;
        setData(rows);
        setReady(true);
        return;
      }
      if (!force && cached && Date.now() - cached.at < MESSAGES_TTL_MS) {
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
          const res = await fetch(
            `/api/hosts/${encodeURIComponent(hostId)}/messages?${params.toString()}`
          );
          if (!res.ok) return cached?.data ?? null;
          const payload = (await res.json()) as HostMessagesInboxPage;
          messagesCache.set(cacheKey, { data: payload, at: Date.now() });
          return payload;
        } catch {
          return cached?.data ?? null;
        }
      })();

      messagesCache.set(cacheKey, {
        data: cached?.data ?? null,
        at: cached?.at ?? 0,
        inflight,
      });

      const rows = await inflight;
      setData(rows);
      setError(rows ? null : "Could not load messages.");
      setReady(true);
    },
    [hostId, cacheKey, page]
  );

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  return { data, ready, error, refresh };
}
