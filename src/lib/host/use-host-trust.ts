"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_TRUST_SYNC_EVENT,
  loadHostTrust,
  saveHostTrust,
  submitCertificationForReview,
} from "./host-trust-data";
import {
  fetchHostTrustFromApi,
  patchHostTrustViaApi,
  shouldUseSharedHostTrust,
} from "./host-trust-api";
import type { HostTrustData } from "./host-trust-types";

export function useHostTrust(hostId: string | undefined) {
  const [data, setData] = useState<HostTrustData | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedHostTrust();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        setData(await fetchHostTrustFromApi(hostId));
      } catch {
        setData(loadHostTrust(hostId));
      }
    } else {
      setData(loadHostTrust(hostId));
    }
    setReady(true);
  }, [hostId, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-trust") void refresh();
    }
    window.addEventListener(HOST_TRUST_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_TRUST_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    data,
    toggleSafety: async (id: string) => {
      if (!data || !hostId) return;
      if (shared) {
        try {
          const trust = await patchHostTrustViaApi(hostId, {
            action: "toggleSafety",
            itemId: id,
          });
          setData(trust);
          window.dispatchEvent(new Event(HOST_TRUST_SYNC_EVENT));
          return;
        } catch {
          // fall through
        }
      }
      const next = {
        ...data,
        safetyChecklist: data.safetyChecklist.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        ),
      };
      saveHostTrust(next);
      setData(next);
    },
    applyForBadge: async (certId: string, documentName: string) => {
      if (!hostId) return null;
      if (shared) {
        try {
          const trust = await patchHostTrustViaApi(hostId, {
            action: "apply",
            certId,
            documentName,
          });
          setData(trust);
          window.dispatchEvent(new Event(HOST_TRUST_SYNC_EVENT));
          return trust;
        } catch {
          // fall through
        }
      }
      const next = submitCertificationForReview(hostId, certId, documentName);
      if (next) setData(next);
      return next;
    },
  };
}
