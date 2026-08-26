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

  const applyLocal = useCallback(() => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }
    setData(loadHostPublicProfile(hostId, fallbackName));
    setReady(true);
  }, [hostId, fallbackName]);

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        const fromApi = await fetchHostProfileFromApi(hostId);
        const local = loadHostPublicProfile(hostId, fallbackName);
        const profile = fromApi
          ? { ...fromApi, logoUrl: local.logoUrl || fromApi.logoUrl, logoFileName: local.logoFileName || fromApi.logoFileName, logoBytes: local.logoBytes ?? fromApi.logoBytes, logoWidth: local.logoWidth ?? fromApi.logoWidth, logoHeight: local.logoHeight ?? fromApi.logoHeight }
          : local;
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
      if (e.key === "farm-stays-host-profiles") applyLocal();
    }
    window.addEventListener(HOST_PROFILES_SYNC_EVENT, applyLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_PROFILES_SYNC_EVENT, applyLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh, applyLocal]);

  async function persist(next: HostPublicProfile) {
    syncInstantBookLocal(next);
    const savedLocal = saveHostPublicProfile(next.hostId, next);
    setData(savedLocal);
    if (shared) {
      try {
        const { hostId: id, ...input } = next;
        const saved = await saveHostProfileToApi(id, input);
        const merged = saved.logoUrl ? saved : { ...saved, logoUrl: next.logoUrl, logoFileName: next.logoFileName, logoBytes: next.logoBytes, logoWidth: next.logoWidth, logoHeight: next.logoHeight };
        saveHostPublicProfile(id, merged);
        setData(merged);
        syncInstantBookLocal(merged);
      } catch {
        // keep the local write — sidebar already updated
      }
    }
    return savedLocal;
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
