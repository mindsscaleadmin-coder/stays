"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LISTING_QUALITY_RULES,
  DEFAULT_LISTING_QUALITY_RULES_STORE,
  LISTING_QUALITY_RULES_SYNC_EVENT,
  applyLegacyQualityPatch,
  defaultRulesForParentName,
  loadListingQualityRulesStore,
  normalizeListingQualityRules,
  resolveRulesForParent,
  saveListingQualityRulesStore,
} from "@/lib/admin/listing-quality-rules-data";
import {
  fetchListingQualityRulesStoreFromApi,
  saveListingQualityRulesStoreToApi,
  shouldUseSharedQualityRules,
} from "@/lib/admin/listing-quality-rules-api";
import type {
  LegacyListingQualityRules,
  ListingQualityRuleItem,
  ListingQualityRules,
  ListingQualityRulesStore,
} from "@/lib/admin/listing-quality-rules-types";
import { qualityRuleKey } from "@/lib/admin/listing-quality-fields";

interface ListingQualityRulesContextValue {
  store: ListingQualityRulesStore;
  /** Fallback rules (legacy). Prefer rulesForParent. */
  rules: ListingQualityRules;
  ready: boolean;
  rulesForParent: (
    parentId?: string | null,
    parentName?: string | null,
    parents?: { id: string; name: string }[]
  ) => ListingQualityRules;
  ensureParentRules: (parentId: string, parentName?: string) => ListingQualityRules;
  addParentRule: (parentId: string, item: ListingQualityRuleItem) => void;
  updateParentRule: (
    parentId: string,
    id: string,
    patch: Partial<ListingQualityRuleItem>
  ) => void;
  removeParentRule: (parentId: string, id: string) => void;
  updateParentRules: (parentId: string, patch: Partial<LegacyListingQualityRules>) => void;
  resetParentRules: (parentId: string, parentName?: string) => void;
  resetAllRules: () => void;
  /** @deprecated Use parent-scoped APIs */
  addRule: (item: ListingQualityRuleItem) => void;
  updateRule: (id: string, patch: Partial<ListingQualityRuleItem>) => void;
  removeRule: (id: string) => void;
  updateRules: (patch: Partial<LegacyListingQualityRules>) => void;
  resetRules: () => void;
}

const ListingQualityRulesContext = createContext<ListingQualityRulesContextValue | null>(null);

function persistLocal(next: ListingQualityRulesStore) {
  saveListingQualityRulesStore(next);
  return next;
}

export function ListingQualityRulesProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ListingQualityRulesStore>(
    DEFAULT_LISTING_QUALITY_RULES_STORE
  );
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedQualityRules();

  const persist = useCallback(
    (next: ListingQualityRulesStore) => {
      if (shared) {
        void saveListingQualityRulesStoreToApi(next).catch(() => persistLocal(next));
        return next;
      }
      return persistLocal(next);
    },
    [shared]
  );

  const refresh = useCallback(() => {
    if (shared) {
      void fetchListingQualityRulesStoreFromApi()
        .then(setStore)
        .catch(() => setStore(loadListingQualityRulesStore()));
      return;
    }
    setStore(loadListingQualityRulesStore());
  }, [shared]);

  useEffect(() => {
    refresh();
    setReady(true);

    function onSync() {
      if (shared) return;
      setStore(loadListingQualityRulesStore());
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

  const rulesForParent = useCallback(
    (
      parentId?: string | null,
      parentName?: string | null,
      parents?: { id: string; name: string }[]
    ) => resolveRulesForParent(store, { parentId, parentName, parents }),
    [store]
  );

  const patchParent = useCallback(
    (parentId: string, nextRules: ListingQualityRules) => {
      setStore((prev) =>
        persist({
          ...prev,
          byParentId: {
            ...prev.byParentId,
            [parentId]: normalizeListingQualityRules(nextRules),
          },
        })
      );
    },
    [persist]
  );

  const ensureParentRules = useCallback(
    (parentId: string, parentName?: string) => {
      const existing = store.byParentId[parentId];
      if (existing) return existing;
      const seeded = parentName
        ? defaultRulesForParentName(parentName)
        : normalizeListingQualityRules(store.fallback);
      patchParent(parentId, seeded);
      return seeded;
    },
    [store, patchParent]
  );

  const value = useMemo<ListingQualityRulesContextValue>(
    () => ({
      store,
      rules: store.fallback,
      ready,
      rulesForParent,
      ensureParentRules,
      addParentRule: (parentId, item) => {
        const current =
          store.byParentId[parentId] ?? normalizeListingQualityRules(store.fallback);
        const key = qualityRuleKey(item);
        if (current.items.some((existing) => qualityRuleKey(existing) === key)) return;
        patchParent(parentId, { items: [...current.items, item] });
      },
      updateParentRule: (parentId, id, patch) => {
        const current =
          store.byParentId[parentId] ?? normalizeListingQualityRules(store.fallback);
        patchParent(parentId, {
          items: current.items.map((item) =>
            item.id === id ? { ...item, ...patch, id: item.id } : item
          ),
        });
      },
      removeParentRule: (parentId, id) => {
        const current =
          store.byParentId[parentId] ?? normalizeListingQualityRules(store.fallback);
        patchParent(parentId, {
          items: current.items.filter((item) => item.id !== id),
        });
      },
      updateParentRules: (parentId, patch) => {
        const current =
          store.byParentId[parentId] ?? normalizeListingQualityRules(store.fallback);
        patchParent(parentId, applyLegacyQualityPatch(current, patch));
      },
      resetParentRules: (parentId, parentName) => {
        patchParent(
          parentId,
          parentName
            ? defaultRulesForParentName(parentName)
            : normalizeListingQualityRules(DEFAULT_LISTING_QUALITY_RULES)
        );
      },
      resetAllRules: () => {
        setStore(persist({ ...DEFAULT_LISTING_QUALITY_RULES_STORE }));
      },
      addRule: (item) => {
        setStore((prev) => {
          const key = qualityRuleKey(item);
          if (prev.fallback.items.some((existing) => qualityRuleKey(existing) === key)) {
            return prev;
          }
          return persist({
            ...prev,
            fallback: { items: [...prev.fallback.items, item] },
          });
        });
      },
      updateRule: (id, patch) => {
        setStore((prev) =>
          persist({
            ...prev,
            fallback: {
              items: prev.fallback.items.map((item) =>
                item.id === id ? { ...item, ...patch, id: item.id } : item
              ),
            },
          })
        );
      },
      removeRule: (id) => {
        setStore((prev) =>
          persist({
            ...prev,
            fallback: {
              items: prev.fallback.items.filter((item) => item.id !== id),
            },
          })
        );
      },
      updateRules: (patch) => {
        setStore((prev) =>
          persist({
            ...prev,
            fallback: applyLegacyQualityPatch(prev.fallback, patch),
          })
        );
      },
      resetRules: () => {
        setStore(persist({ ...DEFAULT_LISTING_QUALITY_RULES_STORE }));
      },
    }),
    [store, ready, rulesForParent, ensureParentRules, patchParent, persist]
  );

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
