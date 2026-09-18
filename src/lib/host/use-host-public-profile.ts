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

function syncInstantBookLocal() {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTANT_BOOK_KEY, "true");
}

function mergeProfile(
  hostId: string,
  fallbackName: string,
  fromApi: HostPublicProfile | null
): HostPublicProfile {
  const local = loadHostPublicProfile(hostId, fallbackName);
  if (!fromApi) return local;
  return {
    ...fromApi,
    logoUrl: local.logoUrl || fromApi.logoUrl,
    logoFileName: local.logoFileName || fromApi.logoFileName,
    logoBytes: local.logoBytes ?? fromApi.logoBytes,
    logoWidth: local.logoWidth ?? fromApi.logoWidth,
    logoHeight: local.logoHeight ?? fromApi.logoHeight,
  };
}

const profileListeners = new Map<string, Set<(profile: HostPublicProfile | null) => void>>();
const profileRefreshInflight = new Map<string, Promise<HostPublicProfile | null>>();

function subscribeHostProfile(
  hostId: string,
  listener: (profile: HostPublicProfile | null) => void
) {
  let set = profileListeners.get(hostId);
  if (!set) {
    set = new Set();
    profileListeners.set(hostId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set?.size === 0) profileListeners.delete(hostId);
  };
}

function broadcastHostProfile(hostId: string, profile: HostPublicProfile | null) {
  profileListeners.get(hostId)?.forEach((listener) => listener(profile));
}

async function refreshHostProfileShared(
  hostId: string,
  fallbackName: string,
  shared: boolean
): Promise<HostPublicProfile | null> {
  if (!shared) {
    return loadHostPublicProfile(hostId, fallbackName);
  }

  const existing = profileRefreshInflight.get(hostId);
  if (existing) return existing;

  const inflight = (async () => {
    const fromApi = await fetchHostProfileFromApi(hostId);
    const profile = mergeProfile(hostId, fallbackName, fromApi);
    syncInstantBookLocal();
    broadcastHostProfile(hostId, profile);
    return profile;
  })().finally(() => {
    profileRefreshInflight.delete(hostId);
  });

  profileRefreshInflight.set(hostId, inflight);
  return inflight;
}

export function useHostPublicProfile(
  hostId: string | undefined,
  fallbackName = ""
) {
  const [data, setData] = useState<HostPublicProfile | null>(() =>
    hostId ? loadHostPublicProfile(hostId, fallbackName) : null
  );
  const [ready, setReady] = useState(true);
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

    const profile = await refreshHostProfileShared(hostId, fallbackName, shared);
    setData(profile);
    setReady(true);
  }, [hostId, fallbackName, shared]);

  useEffect(() => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    setData(loadHostPublicProfile(hostId, fallbackName));
    setReady(true);

    const unsubscribe = subscribeHostProfile(hostId, setData);

    let cancelled = false;
    const runRefresh = () => {
      if (!cancelled) void refreshHostProfileShared(hostId, fallbackName, shared);
    };
    const idleHandle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(runRefresh, { timeout: 2000 })
        : window.setTimeout(runRefresh, 250);

    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-profiles") applyLocal();
    }
    window.addEventListener(HOST_PROFILES_SYNC_EVENT, applyLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      unsubscribe();
      if (typeof requestIdleCallback !== "undefined") {
        cancelIdleCallback(idleHandle as number);
      } else {
        window.clearTimeout(idleHandle as number);
      }
      window.removeEventListener(HOST_PROFILES_SYNC_EVENT, applyLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, [hostId, fallbackName, shared, applyLocal]);

  async function persist(next: HostPublicProfile) {
    syncInstantBookLocal();
    const savedLocal = saveHostPublicProfile(next.hostId, next);
    setData(savedLocal);
    broadcastHostProfile(next.hostId, savedLocal);
    if (shared) {
      try {
        const { hostId: id, ...input } = next;
        const saved = await saveHostProfileToApi(id, input);
        const merged = saved.logoUrl
          ? saved
          : {
              ...saved,
              logoUrl: next.logoUrl,
              logoFileName: next.logoFileName,
              logoBytes: next.logoBytes,
              logoWidth: next.logoWidth,
              logoHeight: next.logoHeight,
            };
        saveHostPublicProfile(id, merged);
        setData(merged);
        broadcastHostProfile(id, merged);
        syncInstantBookLocal();
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
