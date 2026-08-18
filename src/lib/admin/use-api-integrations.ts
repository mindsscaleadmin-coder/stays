"use client";

import { useCallback, useEffect, useState } from "react";
import {
  API_INTEGRATIONS_SYNC_EVENT,
  createApiIntegration,
  loadApiIntegrations,
  resetApiIntegrations,
  saveApiIntegrations,
} from "./api-integrations-data";
import {
  DEFAULT_API_INTEGRATIONS,
  type ApiIntegration,
  type ApiIntegrationInput,
} from "./api-integrations-types";

export function useApiIntegrations() {
  const [items, setItems] = useState<ApiIntegration[]>(DEFAULT_API_INTEGRATIONS);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setItems(loadApiIntegrations());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-api-integrations") refresh();
    }
    window.addEventListener(API_INTEGRATIONS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(API_INTEGRATIONS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    items,
    updateItem: (id: string, patch: Partial<ApiIntegration>) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        );
        saveApiIntegrations(next);
        return next;
      });
    },
    addItem: (input: ApiIntegrationInput) => {
      setItems((prev) => {
        const next = [...prev, createApiIntegration(input)];
        saveApiIntegrations(next);
        return next;
      });
    },
    removeItem: (id: string) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id || item.builtIn);
        saveApiIntegrations(next);
        return next;
      });
    },
    resetDefaults: () => {
      resetApiIntegrations();
      setItems(loadApiIntegrations());
    },
  };
}
