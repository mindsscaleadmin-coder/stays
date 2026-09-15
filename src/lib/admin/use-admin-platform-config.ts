"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PLATFORM_CONFIG_SYNC_EVENT,
  countDisabledIntegrations,
  loadPlatformConfig,
  savePlatformConfig,
} from "./platform-config-data";
import {
  fetchPlatformConfigFromApi,
  savePlatformConfigToApi,
  shouldUseSharedPlatformConfig,
} from "./platform-config-api";
import type { PlatformConfig } from "./platform-config-types";

export function useAdminPlatformConfig() {
  const [config, setConfig] = useState<PlatformConfig>(() => loadPlatformConfig());
  const [ready, setReady] = useState(true);
  const shared = shouldUseSharedPlatformConfig();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        const fromApi = await fetchPlatformConfigFromApi(true);
        setConfig(fromApi);
      } catch {
        setConfig(loadPlatformConfig());
      }
    } else {
      setConfig(loadPlatformConfig());
    }
  }, [shared]);

  useEffect(() => {
    void refresh().then(() => setReady(true));
    function onSync() {
      void refresh();
    }
    window.addEventListener(PLATFORM_CONFIG_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(PLATFORM_CONFIG_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const disabledIntegrationCount = countDisabledIntegrations(config);

  async function persist(next: PlatformConfig) {
    if (shared) {
      try {
        const saved = await savePlatformConfigToApi(next);
        setConfig(saved);
        window.dispatchEvent(new Event(PLATFORM_CONFIG_SYNC_EVENT));
        return saved;
      } catch {
        savePlatformConfig(next);
        setConfig(next);
        return next;
      }
    }
    savePlatformConfig(next);
    setConfig(next);
    return next;
  }

  return {
    ready,
    config,
    disabledIntegrationCount,
    refresh,
    save: (next: PlatformConfig) => {
      void persist(next);
    },
    patch: (updater: (prev: PlatformConfig) => PlatformConfig) => {
      setConfig((prev) => {
        const next = updater(prev);
        void persist(next);
        return next;
      });
    },
  };
}

/** Lightweight read-only hook for host/public surfaces */
export function usePlatformConfig() {
  const [config, setConfig] = useState<PlatformConfig>(loadPlatformConfig());
  const shared = shouldUseSharedPlatformConfig();

  useEffect(() => {
    async function refresh() {
      if (shared) {
        try {
          setConfig(await fetchPlatformConfigFromApi(false));
          return;
        } catch {
          // fall through
        }
      }
      setConfig(loadPlatformConfig());
    }
    void refresh();
    function onSync() {
      void refresh();
    }
    window.addEventListener(PLATFORM_CONFIG_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(PLATFORM_CONFIG_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [shared]);

  return config;
}
