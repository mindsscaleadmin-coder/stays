"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_PROFILES_SYNC_EVENT,
  loadHostPublicProfile,
  saveHostPublicProfile,
} from "./host-profile-data";
import {
  fetchHostProfileFromApi,
  saveHostProfileToApi,
  shouldUseSharedHostProfile,
} from "./host-profile-api";
import type { HostPublicProfile } from "./host-profile-types";

const INSTANT_BOOK_KEY = "farm-stays-host-instant-book-enabled";

function syncInstantBookLocal(profile: HostPublicProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTANT_BOOK_KEY, profile.instantBookEnabled ? "true" : "false");
}

export function useHostPublicProfile(
  hostId: string | undefined,
  fallbackName = ""
) {
  const [data, setData] = useState<HostPublicProfile | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedHostProfile();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        const fromApi = await fetchHostProfileFromApi(hostId);
        const profile = fromApi ?? loadHostPublicProfile(hostId, fallbackName);
        syncInstantBookLocal(profile);
        setData(profile);
      } catch {
        setData(loadHostPublicProfile(hostId, fallbackName));
      }
    } else {
      setData(loadHostPublicProfile(hostId, fallbackName));
    }
    setReady(true);
  }, [hostId, fallbackName, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-profiles") void refresh();
    }
    window.addEventListener(HOST_PROFILES_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_PROFILES_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function persist(next: HostPublicProfile) {
    syncInstantBookLocal(next);
    if (shared) {
      try {
        const { hostId: id, ...input } = next;
        const saved = await saveHostProfileToApi(id, input);
        setData(saved);
        syncInstantBookLocal(saved);
        window.dispatchEvent(new Event(HOST_PROFILES_SYNC_EVENT));
        return saved;
      } catch {
        return saveHostPublicProfile(next.hostId, next);
      }
    }
    return saveHostPublicProfile(next.hostId, next);
  }

  function patch(partial: Partial<HostPublicProfile>) {
    if (!hostId) return;
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      void persist(next);
      return next;
    });
  }

  return { ready, data, patch, refresh };
}
