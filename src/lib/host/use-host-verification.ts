"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_VERIFICATION_SYNC_EVENT,
  findHostVerification,
  getHostVerification,
  loadAllHostVerifications,
  reviewHostVerification,
  submitHostVerification,
} from "./verification-data";
import type {
  HostIdDocumentType,
  HostVerificationDocument,
  HostVerificationRequest,
} from "./verification-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

type VerificationPayload = {
  request: HostVerificationRequest | null;
  all: HostVerificationRequest[];
};

const VERIFICATION_PULL_TTL_MS = 30_000;
const verificationPull = new Map<
  string,
  {
    data: VerificationPayload;
    at: number;
    inflight?: Promise<VerificationPayload>;
  }
>();

function verificationCacheKey(hostId?: string) {
  return hostId || "*all*";
}

export function invalidateHostVerificationCache(hostId?: string) {
  verificationPull.delete(verificationCacheKey(hostId));
}

async function fetchVerification(
  hostId?: string,
  force = false
): Promise<VerificationPayload> {
  const key = verificationCacheKey(hostId);
  const cached = verificationPull.get(key);
  if (!force && cached?.inflight) {
    return cached.inflight;
  }
  if (!force && cached && Date.now() - cached.at < VERIFICATION_PULL_TTL_MS) {
    return cached.data;
  }

  const inflight = (async () => {
    if (hostId) {
      const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/verification`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load verification");
      const data = (await res.json()) as { request: HostVerificationRequest | null };
      const payload = { request: data.request, all: data.request ? [data.request] : [] };
      verificationPull.set(key, { data: payload, at: Date.now() });
      return payload;
    }
    const res = await fetch("/api/hosts/all/verification", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load verifications");
    const data = (await res.json()) as { requests: HostVerificationRequest[] };
    const payload = { request: null, all: data.requests ?? [] };
    verificationPull.set(key, { data: payload, at: Date.now() });
    return payload;
  })().catch((error) => {
    verificationPull.delete(key);
    throw error;
  });

  verificationPull.set(key, {
    data: cached?.data ?? { request: null, all: [] },
    at: cached?.at ?? 0,
    inflight,
  });
  return inflight;
}

export function useHostVerification(hostId?: string) {
  const [request, setRequest] = useState<HostVerificationRequest | null>(() =>
    hostId ? getHostVerification(hostId) : null
  );
  const [all, setAll] = useState<HostVerificationRequest[]>(() => loadAllHostVerifications());
  const [ready, setReady] = useState(true);
  const shared = isSharedDbEnabled();

  const refresh = useCallback(() => {
    if (shared) {
      void fetchVerification(hostId)
        .then((next) => {
          setRequest(next.request ?? (hostId ? next.all.find((r) => r.hostId === hostId) ?? null : null));
          setAll(next.all);
        })
        .catch(() => {
          setAll(loadAllHostVerifications());
          setRequest(hostId ? getHostVerification(hostId) : null);
        });
      setReady(true);
      return;
    }
    setAll(loadAllHostVerifications());
    setRequest(hostId ? getHostVerification(hostId) : null);
    setReady(true);
  }, [hostId, shared]);

  useEffect(() => {
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-verification-requests") refresh();
    }
    window.addEventListener(HOST_VERIFICATION_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_VERIFICATION_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    request,
    all,
    pendingCount: all.filter((r) => r.status === "pending").length,
    refresh,
    findForHost: (host: { id: string; email?: string; name?: string }) =>
      findHostVerification(host),
    submit: (input: {
      hostId: string;
      hostName: string;
      hostEmail: string;
      idType: HostIdDocumentType;
      notes: string;
      documents: HostVerificationDocument[];
    }) => {
      const saved = submitHostVerification(input);
      invalidateHostVerificationCache();
      invalidateHostVerificationCache(input.hostId);
      if (shared) {
        void fetch(`/api/hosts/${encodeURIComponent(input.hostId)}/verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saved),
        }).then(() => refresh());
      }
      refresh();
      return saved;
    },
    approve: (id: string, note?: string) => {
      const saved = reviewHostVerification(id, "verified", note);
      invalidateHostVerificationCache();
      invalidateHostVerificationCache(id);
      if (shared) {
        void fetch(`/api/hosts/${encodeURIComponent(id)}/verification`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "verified", reviewNote: note }),
        }).then(() => refresh());
      }
      refresh();
      return saved;
    },
    reject: (id: string, note?: string) => {
      const saved = reviewHostVerification(id, "rejected", note);
      invalidateHostVerificationCache();
      invalidateHostVerificationCache(id);
      if (shared) {
        void fetch(`/api/hosts/${encodeURIComponent(id)}/verification`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected", reviewNote: note }),
        }).then(() => refresh());
      }
      refresh();
      return saved;
    },
  };
}
