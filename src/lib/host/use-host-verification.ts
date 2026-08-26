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

async function fetchVerification(hostId?: string): Promise<{
  request: HostVerificationRequest | null;
  all: HostVerificationRequest[];
}> {
  if (hostId) {
    const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/verification`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load verification");
    const data = (await res.json()) as { request: HostVerificationRequest | null };
    return { request: data.request, all: data.request ? [data.request] : [] };
  }
  const res = await fetch("/api/hosts/all/verification", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load verifications");
  const data = (await res.json()) as { requests: HostVerificationRequest[] };
  return { request: null, all: data.requests ?? [] };
}

export function useHostVerification(hostId?: string) {
  const [request, setRequest] = useState<HostVerificationRequest | null>(null);
  const [all, setAll] = useState<HostVerificationRequest[]>([]);
  const [ready, setReady] = useState(false);
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
