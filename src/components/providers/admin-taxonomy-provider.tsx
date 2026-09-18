"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  City,
  Country,
  CountryInput,
  District,
  ParentCategory,
  State,
  Subcategory,
  TaxonomyData,
} from "@/lib/admin/taxonomy-types";
import { applyCountryLocations, type CountryGeoState } from "@/lib/admin/country-geo";
import { dedupeTabsById, isDefaultPropertyTab, resolveBuiltInMainTabId } from "@/lib/admin/taxonomy-types";
import {
  loadTaxonomy,
  mergeApiTaxonomyWithLocal,
  mergeTaxonomySources,
  newId,
  namesMatch,
  normalizeTaxonomy,
  saveTaxonomy,
  SEED_TAXONOMY,
  TAXONOMY_STORAGE_KEY,
  TAXONOMY_SYNC_EVENT,
} from "@/lib/admin/taxonomy-data";
import {
  fetchTaxonomyFromApi,
  saveTaxonomyToApi,
  shouldUseSharedTaxonomy,
} from "@/lib/admin/taxonomy-api";
import { asNameList } from "@/lib/admin/parse-bulk-names";
import { relabelSubmittedListings } from "@/lib/listings/submission-data";
import { relabelListingsOnServer } from "@/lib/listings/relabel-listings-api";

function namesNotYetIn<T>(
  items: T[],
  names: string[],
  isDuplicate: (item: T, name: string) => boolean
): string[] {
  const out: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (items.some((item) => isDuplicate(item, trimmed))) continue;
    if (out.some((existing) => namesMatch(existing, trimmed))) continue;
    out.push(trimmed);
  }
  return out;
}

function scheduleListingRelabel(
  changes: Parameters<typeof relabelSubmittedListings>[0]
) {
  queueMicrotask(() => {
    relabelSubmittedListings(changes);
    void relabelListingsOnServer(changes).catch(() => null);
  });
}

interface AdminTaxonomyContextValue {
  data: TaxonomyData;
  ready: boolean;
  addMainTab: (label: string) => string;
  editMainTab: (id: string, label: string) => void;
  deleteMainTab: (id: string) => boolean;
  addExtraTab: (label: string) => string;
  editExtraTab: (id: string, label: string) => void;
  deleteExtraTab: (id: string) => boolean;
  addCountry: (name: string | string[]) => void;
  editCountry: (id: string, name: string) => void;
  saveCountry: (
    input: CountryInput,
    locations?: { geo: CountryGeoState[]; mode?: "merge" | "replace" }
  ) => Promise<{ id: string; statesAdded: number; districtsAdded: number }>;
  importCountryLocations: (
    countryId: string,
    geo: CountryGeoState[],
    mode?: "merge" | "replace"
  ) => { statesAdded: number; districtsAdded: number };
  deleteCountry: (id: string) => void;
  addState: (name: string | string[], countryId: string) => void;
  editState: (id: string, name: string, countryId: string) => void;
  deleteState: (id: string) => void;
  addDistrict: (name: string | string[], stateId: string) => void;
  editDistrict: (id: string, name: string, stateId: string) => void;
  deleteDistrict: (id: string) => void;
  addCity: (name: string | string[], districtId: string) => void;
  editCity: (id: string, name: string, districtId: string) => void;
  deleteCity: (id: string) => void;
  addParent: (name: string | string[]) => void;
  editParent: (id: string, name: string) => void;
  deleteParent: (id: string) => void;
  addCategory: (name: string | string[], parentId: string) => void;
  editCategory: (id: string, name: string, parentId: string) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (name: string | string[], categoryId: string) => void;
  editSubcategory: (id: string, name: string, categoryId: string) => void;
  deleteSubcategory: (id: string) => void;
  addExtraFilter: (
    name: string | string[],
    type: string,
    parentId?: string,
    categoryId?: string,
    subcategoryId?: string
  ) => void;
  editExtraFilter: (
    id: string,
    name: string,
    parentId?: string,
    categoryId?: string,
    subcategoryId?: string
  ) => void;
  deleteExtraFilter: (id: string) => void;
  addFeatureFilter: (name: string | string[], parentId: string, subcategoryId?: string) => void;
  editFeatureFilter: (
    id: string,
    name: string,
    parentId: string,
    subcategoryId?: string
  ) => void;
  deleteFeatureFilter: (id: string) => void;
  addCustomItem: (tabId: string, name: string | string[], subcategoryId?: string) => void;
  editCustomItem: (
    tabId: string,
    id: string,
    name: string,
    subcategoryId?: string
  ) => void;
  deleteCustomItem: (tabId: string, id: string) => void;
  setCountryEnabled: (id: string, enabled: boolean) => void;
  setStateEnabled: (id: string, enabled: boolean) => void;
  setDistrictEnabled: (id: string, enabled: boolean) => void;
  setCityEnabled: (id: string, enabled: boolean) => void;
  setParentEnabled: (id: string, enabled: boolean) => void;
  setCategoryEnabled: (id: string, enabled: boolean) => void;
  setSubcategoryEnabled: (id: string, enabled: boolean) => void;
  setExtraFilterEnabled: (id: string, enabled: boolean) => void;
  setFeatureFilterEnabled: (id: string, enabled: boolean) => void;
  setCustomItemEnabled: (tabId: string, id: string, enabled: boolean) => void;
  setMainTabEnabled: (id: string, enabled: boolean) => void;
  setExtraTabEnabled: (id: string, enabled: boolean) => void;
}

const AdminTaxonomyContext = createContext<AdminTaxonomyContextValue | null>(null);

function persist(data: TaxonomyData): TaxonomyData {
  const next = normalizeTaxonomy(data);
  saveTaxonomy(next);
  if (shouldUseSharedTaxonomy()) {
    void saveTaxonomyToApi(next).catch(() => {});
  }
  return next;
}

async function persistAsync(data: TaxonomyData): Promise<TaxonomyData> {
  const next = normalizeTaxonomy(data);
  saveTaxonomy(next);
  if (!shouldUseSharedTaxonomy()) return next;
  const saved = await saveTaxonomyToApi(next);
  const merged = mergeApiTaxonomyWithLocal(saved, next);
  saveTaxonomy(merged);
  return merged;
}

let taxonomyRefreshInflight: Promise<void> | null = null;
let taxonomyCache: { at: number; data: TaxonomyData } | null = null;
const TAXONOMY_CACHE_MS = 30_000;

function taxonomySnapshotKey(data: TaxonomyData): string {
  return `${data.mainTabs.length}|${data.countries.length}|${data.parents.length}`;
}

export function AdminTaxonomyProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TaxonomyData>(SEED_TAXONOMY);
  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);
  const dataRef = useRef(data);
  const refreshGenRef = useRef(0);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refresh = useCallback(async () => {
    if (taxonomyRefreshInflight) return taxonomyRefreshInflight;
    const refreshGen = ++refreshGenRef.current;
    taxonomyRefreshInflight = (async () => {
      if (
        taxonomyCache &&
        Date.now() - taxonomyCache.at < TAXONOMY_CACHE_MS &&
        taxonomySnapshotKey(taxonomyCache.data) === taxonomySnapshotKey(dataRef.current)
      ) {
        if (refreshGen !== refreshGenRef.current) return;
        setData(taxonomyCache.data);
        hydratedRef.current = true;
        setReady(true);
        return;
      }

      if (shouldUseSharedTaxonomy()) {
        try {
          const apiData = await fetchTaxonomyFromApi();
          if (refreshGen !== refreshGenRef.current) return;

          const localData = loadTaxonomy();
          const merged = mergeTaxonomySources(apiData, localData, dataRef.current);
          const missingCount = merged.mainTabs.length - apiData.mainTabs.length;
          const wouldWipeLocal = localData.mainTabs.some(
            (tab) => !merged.mainTabs.some((m) => m.id === tab.id)
          );

          if (refreshGen !== refreshGenRef.current) return;
          if (taxonomySnapshotKey(merged) !== taxonomySnapshotKey(dataRef.current)) {
            setData(merged);
            taxonomyCache = { at: Date.now(), data: merged };
          }
          if (
            !wouldWipeLocal &&
            taxonomySnapshotKey(merged) !== taxonomySnapshotKey(localData)
          ) {
            saveTaxonomy(merged);
          }
          if (missingCount > 0) {
            void saveTaxonomyToApi(merged).catch(() => {});
          }
          hydratedRef.current = true;
          setReady(true);
          return;
        } catch {
          // fall through
        }
      }
      const local = loadTaxonomy();
      if (taxonomySnapshotKey(local) !== taxonomySnapshotKey(dataRef.current)) {
        setData(local);
        taxonomyCache = { at: Date.now(), data: local };
      }
      hydratedRef.current = true;
      setReady(true);
    })();
    try {
      await taxonomyRefreshInflight;
    } finally {
      taxonomyRefreshInflight = null;
    }
  }, []);

  useEffect(() => {
    void refresh();

    function onStorage(e: StorageEvent) {
      if (e.key === TAXONOMY_STORAGE_KEY) void refresh();
    }

    function onSync() {
      // Same-window saves already updated React state. Refetching shared DB here
      // races the PATCH and wipes items the admin just added.
      if (shouldUseSharedTaxonomy()) return;
      setData(loadTaxonomy());
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(TAXONOMY_SYNC_EVENT, onSync);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TAXONOMY_SYNC_EVENT, onSync);
    };
  }, [refresh]);

  const update = useCallback((updater: (prev: TaxonomyData) => TaxonomyData) => {
    setData((prev) => {
      if (!hydratedRef.current) return prev;
      const next = updater(prev);
      if (next === prev) return prev;
      return persist(next);
    });
  }, []);

  const addMainTab = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return "";

      let createdId = "";
      let blocked = false;
      let apiDraft: TaxonomyData | null = null;

      update((prev) => {
        if (prev.mainTabs.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        if (
          prev.countries.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
        ) {
          blocked = true;
          return prev;
        }
        // Block recreating built-in tabs like "Sub Category" as flat custom tabs
        if (resolveBuiltInMainTabId({ id: "", label: trimmed })) {
          blocked = true;
          return prev;
        }
        const id = newId("tab");
        createdId = id;
        apiDraft = {
          ...prev,
          mainTabs: dedupeTabsById([...prev.mainTabs, { id, label: trimmed, builtIn: false }]),
          customItems: { ...prev.customItems, [id]: [] },
        };
        return apiDraft;
      });

      if (blocked) return "";

      if (createdId && apiDraft && shouldUseSharedTaxonomy()) {
        void persistAsync(apiDraft)
          .then((saved) => {
            setData(saved);
          })
          .catch(() => {});
      }

      return createdId;
    },
    [update]
  );

  const editMainTab = useCallback(
    (id: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      update((prev) => {
        if (
          prev.mainTabs.some(
            (t) => t.id !== id && t.label.toLowerCase() === trimmed.toLowerCase()
          )
        ) {
          return prev;
        }
        const from = prev.mainTabs.find((t) => t.id === id)?.label;
        if (from && from !== trimmed) {
          scheduleListingRelabel({
            customFilter: { fromLabel: from, toLabel: trimmed },
          });
        }
        return {
          ...prev,
          mainTabs: prev.mainTabs.map((t) => (t.id === id ? { ...t, label: trimmed } : t)),
        };
      });
    },
    [update]
  );

  const deleteMainTab = useCallback(
    (id: string) => {
      let deleted = false;
      update((prev) => {
        const tab = prev.mainTabs.find((t) => t.id === id);
        if (!tab || tab.builtIn || isDefaultPropertyTab(id)) return prev;
        deleted = true;
        const { [id]: _, ...restCustom } = prev.customItems;
        return {
          ...prev,
          mainTabs: prev.mainTabs.filter((t) => t.id !== id),
          customItems: restCustom,
        };
      });
      return deleted;
    },
    [update]
  );

  const addExtraTab = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return "";

      let createdId = "";
      update((prev) => {
        if (prev.extraTabs.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        const id = newId("extab");
        createdId = id;
        return {
          ...prev,
          extraTabs: dedupeTabsById([...prev.extraTabs, { id, label: trimmed, builtIn: false }]),
        };
      });
      return createdId;
    },
    [update]
  );

  const editExtraTab = useCallback(
    (id: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      update((prev) => {
        if (
          prev.extraTabs.some(
            (t) => t.id !== id && t.label.toLowerCase() === trimmed.toLowerCase()
          )
        ) {
          return prev;
        }
        const from = prev.extraTabs.find((t) => t.id === id)?.label;
        if (from && from !== trimmed) {
          scheduleListingRelabel({
            customFilter: { fromLabel: from, toLabel: trimmed },
          });
        }
        return {
          ...prev,
          extraTabs: prev.extraTabs.map((t) => (t.id === id ? { ...t, label: trimmed } : t)),
        };
      });
    },
    [update]
  );

  const deleteExtraTab = useCallback(
    (id: string) => {
      let deleted = false;
      update((prev) => {
        const tab = prev.extraTabs.find((t) => t.id === id);
        if (!tab || tab.builtIn) return prev;
        deleted = true;
        return {
          ...prev,
          extraTabs: prev.extraTabs.filter((t) => t.id !== id),
          extraFilters: prev.extraFilters.filter((ef) => ef.type !== id),
        };
      });
      return deleted;
    },
    [update]
  );

  const addCustomItem = useCallback(
    (tabId: string, nameOrNames: string | string[], subcategoryId?: string) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        const existing = prev.customItems[tabId] ?? [];
        const toAdd = namesNotYetIn(existing, names, (item, name) => namesMatch(item.name, name));
        if (!toAdd.length) return prev;
        return {
          ...prev,
          customItems: {
            ...prev.customItems,
            [tabId]: [
              ...existing,
              ...toAdd.map((name) => ({
                id: newId("ci"),
                name,
                ...(subcategoryId ? { subcategoryId } : {}),
              })),
            ],
          },
        };
      });
    },
    [update]
  );

  const editCustomItem = useCallback(
    (tabId: string, id: string, name: string, subcategoryId?: string) => {
      const trimmed = name.trim();
      update((prev) => {
        const from = (prev.customItems[tabId] ?? []).find((item) => item.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({
            customFilter: { fromValue: from, toValue: trimmed },
          });
        }
        return {
          ...prev,
          customItems: {
            ...prev.customItems,
            [tabId]: (prev.customItems[tabId] ?? []).map((item) =>
              item.id === id
                ? {
                    ...item,
                    name: trimmed,
                    subcategoryId: subcategoryId || undefined,
                  }
                : item
            ),
          },
        };
      });
    },
    [update]
  );

  const deleteCustomItem = useCallback(
    (tabId: string, id: string) =>
      update((prev) => ({
        ...prev,
        customItems: {
          ...prev.customItems,
          [tabId]: (prev.customItems[tabId] ?? []).filter((item) => item.id !== id),
        },
      })),
    [update]
  );

  const addCountry = useCallback(
    (nameOrNames: string | string[]) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        const toAdd = namesNotYetIn(prev.countries, names, (item, name) =>
          namesMatch(item.name, name)
        );
        if (!toAdd.length) return prev;
        return {
          ...prev,
          countries: [
            ...prev.countries,
            ...toAdd.map((name) => ({
              id: newId("c"),
              name,
              enabled: true,
              comingSoon: false,
              exchangeRateToAED: 1,
            })),
          ],
        };
      });
    },
    [update]
  );

  const editCountry = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      update((prev) => {
        const from = prev.countries.find((c) => c.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ country: { from, to: trimmed } });
        }
        return {
          ...prev,
          countries: prev.countries.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
        };
      });
    },
    [update]
  );

  const saveCountry = useCallback(
    async (
      input: CountryInput,
      locations?: { geo: CountryGeoState[]; mode?: "merge" | "replace" }
    ) => {
      if (!hydratedRef.current) {
        throw new Error("Taxonomy is still loading. Try again in a moment.");
      }
      const id = input.id ?? newId("c");
      const nextCountry: Country = {
        id,
        name: input.name.trim(),
        code: input.code?.trim().toUpperCase() || undefined,
        flag: input.flag?.trim() || undefined,
        currency: input.currency?.trim().toUpperCase() || undefined,
        currencySymbol: input.currencySymbol?.trim() || undefined,
        exchangeRateToAED: input.exchangeRateToAED ?? 1,
        taxPct: input.taxPct ?? 5,
        taxLabel: input.taxLabel?.trim() || "VAT",
        dialCode: input.dialCode?.trim() || undefined,
        enabled: input.enabled ?? true,
        comingSoon: input.comingSoon ?? false,
      };
      const from = data.countries.find((c) => c.id === id)?.name;
      if (from && from !== nextCountry.name) {
        scheduleListingRelabel({ country: { from, to: nextCountry.name } });
      }
      const exists = data.countries.some((c) => c.id === id);
      let next: TaxonomyData = {
        ...data,
        countries: exists
          ? data.countries.map((c) => (c.id === id ? nextCountry : c))
          : [...data.countries, nextCountry],
      };
      let statesAdded = 0;
      let districtsAdded = 0;
      if (locations?.geo?.length) {
        const applied = applyCountryLocations(
          next,
          id,
          locations.geo,
          locations.mode ?? "merge"
        );
        next = applied.data;
        statesAdded = applied.statesAdded;
        districtsAdded = applied.districtsAdded;
      }
      const saved = await persistAsync(next);
      setData(saved);
      return { id, statesAdded, districtsAdded };
    },
    [data]
  );

  const importCountryLocations = useCallback(
    (countryId: string, geo: CountryGeoState[], mode: "merge" | "replace" = "merge") => {
      let statesAdded = 0;
      let districtsAdded = 0;
      update((prev) => {
        const applied = applyCountryLocations(prev, countryId, geo, mode);
        statesAdded = applied.statesAdded;
        districtsAdded = applied.districtsAdded;
        return applied.data;
      });
      return { statesAdded, districtsAdded };
    },
    [update]
  );

  const deleteCountry = useCallback(
    (id: string) =>
      update((prev) => {
        const stateIds = prev.states.filter((s) => s.countryId === id).map((s) => s.id);
        const districtIds = prev.districts
          .filter((d) => stateIds.includes(d.stateId))
          .map((d) => d.id);
        return {
          ...prev,
          countries: prev.countries.filter((c) => c.id !== id),
          states: prev.states.filter((s) => s.countryId !== id),
          districts: prev.districts.filter((d) => !stateIds.includes(d.stateId)),
          cities: (prev.cities ?? []).filter((c) => !districtIds.includes(c.districtId)),
        };
      }),
    [update]
  );

  const addState = useCallback(
    (nameOrNames: string | string[], countryId: string) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        const scoped = prev.states.filter((s) => s.countryId === countryId);
        const toAdd = namesNotYetIn(scoped, names, (item, name) => namesMatch(item.name, name));
        if (!toAdd.length) return prev;
        return {
          ...prev,
          states: [
            ...prev.states,
            ...toAdd.map((name) => ({ id: newId("s"), name, countryId })),
          ],
        };
      });
    },
    [update]
  );

  const editState = useCallback(
    (id: string, name: string, countryId: string) => {
      const trimmed = name.trim();
      update((prev) => {
        const from = prev.states.find((s) => s.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ state: { from, to: trimmed } });
        }
        return {
          ...prev,
          states: prev.states.map((s) => (s.id === id ? { ...s, name: trimmed, countryId } : s)),
        };
      });
    },
    [update]
  );

  const deleteState = useCallback(
    (id: string) =>
      update((prev) => {
        const districtIds = prev.districts.filter((d) => d.stateId === id).map((d) => d.id);
        return {
          ...prev,
          states: prev.states.filter((s) => s.id !== id),
          districts: prev.districts.filter((d) => d.stateId !== id),
          cities: (prev.cities ?? []).filter((c) => !districtIds.includes(c.districtId)),
        };
      }),
    [update]
  );

  const addDistrict = useCallback(
    (nameOrNames: string | string[], stateId: string) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        const scoped = prev.districts.filter((d) => d.stateId === stateId);
        const toAdd = namesNotYetIn(scoped, names, (item, name) => namesMatch(item.name, name));
        if (!toAdd.length) return prev;
        return {
          ...prev,
          districts: [
            ...prev.districts,
            ...toAdd.map((name) => ({ id: newId("d"), name, stateId })),
          ],
        };
      });
    },
    [update]
  );

  const editDistrict = useCallback(
    (id: string, name: string, stateId: string) => {
      const trimmed = name.trim();
      update((prev) => {
        const from = prev.districts.find((d) => d.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ district: { from, to: trimmed } });
        }
        return {
          ...prev,
          districts: prev.districts.map((d) =>
            d.id === id ? { ...d, name: trimmed, stateId } : d
          ),
        };
      });
    },
    [update]
  );

  const deleteDistrict = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        districts: prev.districts.filter((d) => d.id !== id),
        cities: (prev.cities ?? []).filter((c) => c.districtId !== id),
      })),
    [update]
  );

  const addCity = useCallback(
    (nameOrNames: string | string[], districtId: string) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        if (!districtId || !prev.districts.some((d) => d.id === districtId)) return prev;
        const cities = prev.cities ?? [];
        const scoped = cities.filter((c) => c.districtId === districtId);
        const toAdd = namesNotYetIn(scoped, names, (item, name) => namesMatch(item.name, name));
        if (!toAdd.length) return prev;
        return {
          ...prev,
          cities: [
            ...cities,
            ...toAdd.map((name) => ({ id: newId("ct"), name, districtId })),
          ],
        };
      });
    },
    [update]
  );

  const editCity = useCallback(
    (id: string, name: string, districtId: string) => {
      const trimmed = name.trim();
      update((prev) => {
        const from = (prev.cities ?? []).find((c) => c.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ city: { from, to: trimmed } });
        }
        return {
          ...prev,
          cities: (prev.cities ?? []).map((c) =>
            c.id === id ? { ...c, name: trimmed, districtId } : c
          ),
        };
      });
    },
    [update]
  );

  const deleteCity = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        cities: (prev.cities ?? []).filter((c) => c.id !== id),
      })),
    [update]
  );

  const addParent = useCallback(
    (nameOrNames: string | string[]) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        const toAdd = namesNotYetIn(prev.parents, names, (item, name) =>
          namesMatch(item.name, name)
        );
        if (!toAdd.length) return prev;
        return {
          ...prev,
          parents: [...prev.parents, ...toAdd.map((name) => ({ id: newId("p"), name }))],
        };
      });
    },
    [update]
  );

  const editParent = useCallback(
    (id: string, name: string) =>
      update((prev) => {
        const trimmed = name.trim();
        if (!trimmed) return prev;
        if (prev.parents.some((p) => p.id !== id && namesMatch(p.name, trimmed))) {
          return prev;
        }
        const from = prev.parents.find((p) => p.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ parentCategory: { from, to: trimmed } });
        }
        return {
          ...prev,
          parents: prev.parents.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
        };
      }),
    [update]
  );

  const deleteParent = useCallback(
    (id: string) =>
      update((prev) => {
        const categoryIds = new Set(
          prev.categories.filter((c) => c.parentId === id).map((c) => c.id)
        );
        return {
          ...prev,
          parents: prev.parents.filter((p) => p.id !== id),
          categories: prev.categories.filter((c) => c.parentId !== id),
          subcategories: prev.subcategories.filter(
            (sc) => sc.parentId !== id && !categoryIds.has(sc.categoryId)
          ),
          featureFilters: prev.featureFilters.filter((ff) => ff.parentId !== id),
        };
      }),
    [update]
  );

  const addCategory = useCallback(
    (nameOrNames: string | string[], parentId: string) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        const scoped = prev.categories.filter((c) => c.parentId === parentId);
        const toAdd = namesNotYetIn(scoped, names, (item, name) => namesMatch(item.name, name));
        if (!toAdd.length) return prev;
        return {
          ...prev,
          categories: [
            ...prev.categories,
            ...toAdd.map((name) => ({ id: newId("cat"), name, parentId })),
          ],
        };
      });
    },
    [update]
  );

  const editCategory = useCallback(
    (id: string, name: string, parentId: string) => {
      const trimmed = name.trim();
      update((prev) => {
        const from = prev.categories.find((c) => c.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ category: { from, to: trimmed } });
        }
        return {
          ...prev,
          categories: prev.categories.map((c) =>
            c.id === id ? { ...c, name: trimmed, parentId } : c
          ),
          subcategories: prev.subcategories.map((sc) =>
            sc.categoryId === id ? { ...sc, parentId } : sc
          ),
        };
      });
    },
    [update]
  );

  const deleteCategory = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        subcategories: prev.subcategories.filter((sc) => sc.categoryId !== id),
      })),
    [update]
  );

  const addSubcategory = useCallback(
    (nameOrNames: string | string[], categoryId: string) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        const category = prev.categories.find((c) => c.id === categoryId);
        if (!category) return prev;
        const scoped = prev.subcategories.filter((sc) => sc.categoryId === categoryId);
        const toAdd = namesNotYetIn(scoped, names, (item, name) => namesMatch(item.name, name));
        if (!toAdd.length) return prev;
        return {
          ...prev,
          subcategories: [
            ...prev.subcategories,
            ...toAdd.map((name) => ({
              id: newId("sc"),
              name,
              parentId: category.parentId,
              categoryId,
            })),
          ],
        };
      });
    },
    [update]
  );

  const editSubcategory = useCallback(
    (id: string, name: string, categoryId: string) =>
      update((prev) => {
        const category = prev.categories.find((c) => c.id === categoryId);
        const trimmed = name.trim();
        const from = prev.subcategories.find((sc) => sc.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ subcategory: { from, to: trimmed } });
        }
        return {
          ...prev,
          subcategories: prev.subcategories.map((sc) =>
            sc.id === id
              ? {
                  ...sc,
                  name: trimmed,
                  categoryId,
                  parentId: category?.parentId ?? sc.parentId,
                }
              : sc
          ),
        };
      }),
    [update]
  );

  const deleteSubcategory = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        subcategories: prev.subcategories.filter((sc) => sc.id !== id),
      })),
    [update]
  );

  const addExtraFilter = useCallback(
    (
      nameOrNames: string | string[],
      type: string,
      parentId?: string,
      categoryId?: string,
      subcategoryId?: string
    ) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      const parentScope = parentId?.trim() || "";
      const categoryScope = categoryId?.trim() || "";
      const subScope = subcategoryId?.trim() || "";
      update((prev) => {
        const scoped = prev.extraFilters.filter(
          (ef) =>
            ef.type === type &&
            (ef.parentId ?? "") === parentScope &&
            (ef.categoryId ?? "") === categoryScope &&
            (ef.subcategoryId ?? "") === subScope
        );
        const toAdd = namesNotYetIn(scoped, names, (item, name) => namesMatch(item.name, name));
        if (!toAdd.length) return prev;
        return {
          ...prev,
          extraFilters: [
            ...prev.extraFilters,
            ...toAdd.map((name) => ({
              id: newId("ef"),
              name,
              type,
              ...(parentScope ? { parentId: parentScope } : {}),
              ...(categoryScope ? { categoryId: categoryScope } : {}),
              ...(subScope ? { subcategoryId: subScope } : {}),
            })),
          ],
        };
      });
    },
    [update]
  );

  const editExtraFilter = useCallback(
    (
      id: string,
      name: string,
      parentId?: string,
      categoryId?: string,
      subcategoryId?: string
    ) => {
      const trimmed = name.trim();
      const parentScope = parentId?.trim() || "";
      const categoryScope = categoryId?.trim() || "";
      const subScope = subcategoryId?.trim() || "";
      update((prev) => {
        const from = prev.extraFilters.find((ef) => ef.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ extraFilter: { from, to: trimmed } });
        }
        return {
          ...prev,
          extraFilters: prev.extraFilters.map((ef) =>
            ef.id === id
              ? {
                  ...ef,
                  name: trimmed,
                  parentId: parentScope || undefined,
                  categoryId: categoryScope || undefined,
                  subcategoryId: subScope || undefined,
                }
              : ef
          ),
        };
      });
    },
    [update]
  );

  const deleteExtraFilter = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        extraFilters: prev.extraFilters.filter((ef) => ef.id !== id),
      })),
    [update]
  );

  const addFeatureFilter = useCallback(
    (nameOrNames: string | string[], parentId: string, subcategoryId?: string) => {
      const names = asNameList(nameOrNames);
      if (!names.length) return;
      update((prev) => {
        const scoped = prev.featureFilters.filter((ff) => ff.parentId === parentId);
        const toAdd = namesNotYetIn(scoped, names, (item, name) => namesMatch(item.name, name));
        if (!toAdd.length) return prev;
        return {
          ...prev,
          featureFilters: [
            ...prev.featureFilters,
            ...toAdd.map((name) => ({
              id: newId("ff"),
              name,
              parentId,
              ...(subcategoryId ? { subcategoryId } : {}),
            })),
          ],
        };
      });
    },
    [update]
  );

  const editFeatureFilter = useCallback(
    (id: string, name: string, parentId: string, subcategoryId?: string) => {
      const trimmed = name.trim();
      update((prev) => {
        const from = prev.featureFilters.find((ff) => ff.id === id)?.name;
        if (from && from !== trimmed) {
          scheduleListingRelabel({ extraFilter: { from, to: trimmed } });
        }
        return {
          ...prev,
          featureFilters: prev.featureFilters.map((ff) =>
            ff.id === id
              ? {
                  ...ff,
                  name: trimmed,
                  parentId,
                  subcategoryId: subcategoryId || undefined,
                }
              : ff
          ),
        };
      });
    },
    [update]
  );

  const deleteFeatureFilter = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        featureFilters: prev.featureFilters.filter((ff) => ff.id !== id),
      })),
    [update]
  );

  const setCountryEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        countries: prev.countries.map((c) => (c.id === id ? { ...c, enabled } : c)),
      })),
    [update]
  );

  const setStateEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        states: prev.states.map((s) => (s.id === id ? { ...s, enabled } : s)),
      })),
    [update]
  );

  const setDistrictEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        districts: prev.districts.map((d) => (d.id === id ? { ...d, enabled } : d)),
      })),
    [update]
  );

  const setCityEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        cities: (prev.cities ?? []).map((c) => (c.id === id ? { ...c, enabled } : c)),
      })),
    [update]
  );

  const setParentEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        parents: prev.parents.map((p) => (p.id === id ? { ...p, enabled } : p)),
      })),
    [update]
  );

  const setCategoryEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => (c.id === id ? { ...c, enabled } : c)),
      })),
    [update]
  );

  const setSubcategoryEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        subcategories: prev.subcategories.map((sc) =>
          sc.id === id ? { ...sc, enabled } : sc
        ),
      })),
    [update]
  );

  const setExtraFilterEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        extraFilters: prev.extraFilters.map((ef) =>
          ef.id === id ? { ...ef, enabled } : ef
        ),
      })),
    [update]
  );

  const setFeatureFilterEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        featureFilters: prev.featureFilters.map((ff) =>
          ff.id === id ? { ...ff, enabled } : ff
        ),
      })),
    [update]
  );

  const setCustomItemEnabled = useCallback(
    (tabId: string, id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        customItems: {
          ...prev.customItems,
          [tabId]: (prev.customItems[tabId] ?? []).map((item) =>
            item.id === id ? { ...item, enabled } : item
          ),
        },
      })),
    [update]
  );

  const setMainTabEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        mainTabs: prev.mainTabs.map((t) => (t.id === id ? { ...t, enabled } : t)),
      })),
    [update]
  );

  const setExtraTabEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((prev) => ({
        ...prev,
        extraTabs: prev.extraTabs.map((t) => (t.id === id ? { ...t, enabled } : t)),
      })),
    [update]
  );

  return (
    <AdminTaxonomyContext.Provider
      value={{
        data,
        ready,
        addMainTab,
        editMainTab,
        deleteMainTab,
        addExtraTab,
        editExtraTab,
        deleteExtraTab,
        addCountry,
        editCountry,
        saveCountry,
        importCountryLocations,
        deleteCountry,
        addState,
        editState,
        deleteState,
        addDistrict,
        editDistrict,
        deleteDistrict,
        addCity,
        editCity,
        deleteCity,
        addParent,
        editParent,
        deleteParent,
        addCategory,
        editCategory,
        deleteCategory,
        addSubcategory,
        editSubcategory,
        deleteSubcategory,
        addExtraFilter,
        editExtraFilter,
        deleteExtraFilter,
        addFeatureFilter,
        editFeatureFilter,
        deleteFeatureFilter,
        addCustomItem,
        editCustomItem,
        deleteCustomItem,
        setCountryEnabled,
        setStateEnabled,
        setDistrictEnabled,
        setCityEnabled,
        setParentEnabled,
        setCategoryEnabled,
        setSubcategoryEnabled,
        setExtraFilterEnabled,
        setFeatureFilterEnabled,
        setCustomItemEnabled,
        setMainTabEnabled,
        setExtraTabEnabled,
      }}
    >
      {children}
    </AdminTaxonomyContext.Provider>
  );
}

export function useAdminTaxonomy() {
  const ctx = useContext(AdminTaxonomyContext);
  if (!ctx) throw new Error("useAdminTaxonomy must be used within AdminTaxonomyProvider");
  return ctx;
}

export type { City, Country, State, District, ParentCategory, Subcategory };
