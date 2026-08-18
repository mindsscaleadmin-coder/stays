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

export function useHostVerification(hostId?: string) {
  const [request, setRequest] = useState<HostVerificationRequest | null>(null);
  const [all, setAll] = useState<HostVerificationRequest[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setAll(loadAllHostVerifications());
    setRequest(hostId ? getHostVerification(hostId) : null);
    setReady(true);
  }, [hostId]);

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
      refresh();
      return saved;
    },
    approve: (id: string, note?: string) => {
      const saved = reviewHostVerification(id, "verified", note);
      refresh();
      return saved;
    },
    reject: (id: string, note?: string) => {
      const saved = reviewHostVerification(id, "rejected", note);
      refresh();
      return saved;
    },
  };
}
