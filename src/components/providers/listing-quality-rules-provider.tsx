"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LISTING_QUALITY_RULES,
  LISTING_QUALITY_RULES_SYNC_EVENT,
  loadListingQualityRules,
  saveListingQualityRules,
} from "@/lib/admin/listing-quality-rules-data";
import type { ListingQualityRules } from "@/lib/admin/listing-quality-rules-types";

interface ListingQualityRulesContextValue {
  rules: ListingQualityRules;
  ready: boolean;
  updateRules: (updates: Partial<ListingQualityRules>) => void;
  resetRules: () => void;
}

const ListingQualityRulesContext = createContext<ListingQualityRulesContextValue | null>(null);

export function ListingQualityRulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<ListingQualityRules>(DEFAULT_LISTING_QUALITY_RULES);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setRules(loadListingQualityRules());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);

    function onSync() {
      refresh();
    }

    window.addEventListener(LISTING_QUALITY_RULES_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(LISTING_QUALITY_RULES_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const value: ListingQualityRulesContextValue = {
    rules,
    ready,
    updateRules: (updates) => {
      setRules((prev) => {
        const next = { ...prev, ...updates };
        saveListingQualityRules(next);
        return next;
      });
    },
    resetRules: () => {
      saveListingQualityRules(DEFAULT_LISTING_QUALITY_RULES);
      setRules(DEFAULT_LISTING_QUALITY_RULES);
    },
  };

  return (
    <ListingQualityRulesContext.Provider value={value}>
      {children}
    </ListingQualityRulesContext.Provider>
  );
}

export function useListingQualityRules() {
  const ctx = useContext(ListingQualityRulesContext);
  if (!ctx) {
    throw new Error("useListingQualityRules must be used within ListingQualityRulesProvider");
  }
  return ctx;
}
