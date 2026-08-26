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
  applyLegacyQualityPatch,
  loadListingQualityRules,
  saveListingQualityRules,
} from "@/lib/admin/listing-quality-rules-data";
import {
  fetchListingQualityRulesFromApi,
  saveListingQualityRulesToApi,
  shouldUseSharedQualityRules,
} from "@/lib/admin/listing-quality-rules-api";
import type {
  LegacyListingQualityRules,
  ListingQualityRuleItem,
  ListingQualityRules,
} from "@/lib/admin/listing-quality-rules-types";
import { qualityRuleKey } from "@/lib/admin/listing-quality-fields";

interface ListingQualityRulesContextValue {
  rules: ListingQualityRules;
  ready: boolean;
  addRule: (item: ListingQualityRuleItem) => void;
  updateRule: (id: string, patch: Partial<ListingQualityRuleItem>) => void;
  removeRule: (id: string) => void;
  updateRules: (patch: Partial<LegacyListingQualityRules>) => void;
  resetRules: () => void;
}

const ListingQualityRulesContext = createContext<ListingQualityRulesContextValue | null>(null);

function persistLocal(next: ListingQualityRules) {
  saveListingQualityRules(next);
  return next;
}

export function ListingQualityRulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<ListingQualityRules>(DEFAULT_LISTING_QUALITY_RULES);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedQualityRules();

  const persist = useCallback(
    (next: ListingQualityRules) => {
      if (shared) {
        void saveListingQualityRulesToApi(next).catch(() => persistLocal(next));
        return next;
      }
      return persistLocal(next);
    },
    [shared]
  );

  const refresh = useCallback(() => {
    if (shared) {
      void fetchListingQualityRulesFromApi()
        .then(setRules)
        .catch(() => setRules(loadListingQualityRules()));
      return;
    }
    setRules(loadListingQualityRules());
  }, [shared]);

  useEffect(() => {
    refresh();
    setReady(true);

    function onSync() {
      if (shared) return;
      setRules(loadListingQualityRules());
    }
    function onStorage(e: StorageEvent) {
      if (e.key && e.key !== "farm-stays-listing-quality-rules") return;
      onSync();
    }

    window.addEventListener(LISTING_QUALITY_RULES_SYNC_EVENT, onSync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LISTING_QUALITY_RULES_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh, shared]);

  const value: ListingQualityRulesContextValue = {
    rules,
    ready,
    addRule: (item) => {
      setRules((prev) => {
        const key = qualityRuleKey(item);
        if (prev.items.some((existing) => qualityRuleKey(existing) === key)) return prev;
        return persist({ items: [...prev.items, item] });
      });
    },
    updateRule: (id, patch) => {
      setRules((prev) =>
        persist({
          items: prev.items.map((item) => (item.id === id ? { ...item, ...patch, id: item.id } : item)),
        })
      );
    },
    removeRule: (id) => {
      setRules((prev) => persist({ items: prev.items.filter((item) => item.id !== id) }));
    },
    updateRules: (patch) => {
      setRules((prev) => persist(applyLegacyQualityPatch(prev, patch)));
    },
    resetRules: () => {
      setRules(persist(DEFAULT_LISTING_QUALITY_RULES));
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
