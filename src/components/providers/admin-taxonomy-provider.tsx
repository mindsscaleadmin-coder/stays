"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  Country,
  CountryInput,
  District,
  ParentCategory,
  State,
  Subcategory,
  TaxonomyData,
} from "@/lib/admin/taxonomy-types";
import { buildLocationRows, type CountryGeoState } from "@/lib/admin/country-geo";
import { dedupeTabsById, isDefaultPropertyTab, resolveBuiltInMainTabId } from "@/lib/admin/taxonomy-types";
import { loadTaxonomy, newId, namesMatch, normalizeTaxonomy, saveTaxonomy, SEED_TAXONOMY, TAXONOMY_STORAGE_KEY, TAXONOMY_SYNC_EVENT } from "@/lib/admin/taxonomy-data";
import {
  fetchTaxonomyFromApi,
  saveTaxonomyToApi,
  shouldUseSharedTaxonomy,
} from "@/lib/admin/taxonomy-api";

interface AdminTaxonomyContextValue {
  data: TaxonomyData;
  addMainTab: (label: string) => string;
  editMainTab: (id: string, label: string) => void;
  deleteMainTab: (id: string) => boolean;
  addExtraTab: (label: string) => string;
  editExtraTab: (id: string, label: string) => void;
  deleteExtraTab: (id: string) => boolean;
  addCountry: (name: string) => void;
  editCountry: (id: string, name: string) => void;
  saveCountry: (input: CountryInput) => string;
  importCountryLocations: (
    countryId: string,
    geo: CountryGeoState[],
    mode?: "merge" | "replace"
  ) => { statesAdded: number; districtsAdded: number };
  deleteCountry: (id: string) => void;
  addState: (name: string, countryId: string) => void;
  editState: (id: string, name: string, countryId: string) => void;
  deleteState: (id: string) => void;
  addDistrict: (name: string, stateId: string) => void;
  editDistrict: (id: string, name: string, stateId: string) => void;
  deleteDistrict: (id: string) => void;
  addParent: (name: string) => void;
  editParent: (id: string, name: string) => void;
  deleteParent: (id: string) => void;
  addCategory: (name: string, parentId: string) => void;
  editCategory: (id: string, name: string, parentId: string) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (name: string, categoryId: string) => void;
  editSubcategory: (id: string, name: string, categoryId: string) => void;
  deleteSubcategory: (id: string) => void;
  addExtraFilter: (name: string, type: string) => void;
  editExtraFilter: (id: string, name: string) => void;
  deleteExtraFilter: (id: string) => void;
  addFeatureFilter: (name: string, parentId: string, subcategoryId?: string) => void;
  editFeatureFilter: (
    id: string,
    name: string,
    parentId: string,
    subcategoryId?: string
  ) => void;
  deleteFeatureFilter: (id: string) => void;
  addCustomItem: (tabId: string, name: string, subcategoryId?: string) => void;
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
    void saveTaxonomyToApi(next).catch(() => null);
  }
  return next;
}

export function AdminTaxonomyProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TaxonomyData>(SEED_TAXONOMY);

  const refresh = useCallback(async () => {
    if (shouldUseSharedTaxonomy()) {
      try {
        setData(await fetchTaxonomyFromApi());
        return;
      } catch {
        // fall through
      }
    }
    setData(loadTaxonomy());
  }, []);

  useEffect(() => {
    refresh();

    function onStorage(e: StorageEvent) {
      if (e.key === TAXONOMY_STORAGE_KEY) refresh();
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
        return {
          ...prev,
          mainTabs: dedupeTabsById([...prev.mainTabs, { id, label: trimmed, builtIn: false }]),
          customItems: { ...prev.customItems, [id]: [] },
        };
      });
      if (blocked) return "";
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
    (tabId: string, name: string, subcategoryId?: string) =>
      update((prev) => {
        const trimmed = name.trim();
        const existing = prev.customItems[tabId] ?? [];
        if (existing.some((item) => namesMatch(item.name, trimmed))) return prev;
        return {
          ...prev,
          customItems: {
            ...prev.customItems,
            [tabId]: [
              ...existing,
              {
                id: newId("ci"),
                name: trimmed,
                ...(subcategoryId ? { subcategoryId } : {}),
              },
            ],
          },
        };
      }),
    [update]
  );

  const editCustomItem = useCallback(
    (tabId: string, id: string, name: string, subcategoryId?: string) =>
      update((prev) => ({
        ...prev,
        customItems: {
          ...prev.customItems,
          [tabId]: (prev.customItems[tabId] ?? []).map((item) =>
            item.id === id
              ? {
                  ...item,
                  name,
                  subcategoryId: subcategoryId || undefined,
                }
              : item
          ),
        },
      })),
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
    (name: string) =>
      update((prev) => {
        const trimmed = name.trim();
        if (prev.countries.some((c) => namesMatch(c.name, trimmed))) return prev;
        return {
          ...prev,
          countries: [
            ...prev.countries,
            {
              id: newId("c"),
              name: trimmed,
              enabled: true,
              comingSoon: false,
              exchangeRateToAED: 1,
            },
          ],
        };
      }),
    [update]
  );

  const editCountry = useCallback(
    (id: string, name: string) =>
      update((prev) => ({
        ...prev,
        countries: prev.countries.map((c) => (c.id === id ? { ...c, name } : c)),
      })),
    [update]
  );

  const saveCountry = useCallback(
    (input: CountryInput) => {
      const id = input.id ?? newId("c");
      update((prev) => {
        const next: Country = {
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
        const exists = prev.countries.some((c) => c.id === id);
        return {
          ...prev,
          countries: exists
            ? prev.countries.map((c) => (c.id === id ? next : c))
            : [...prev.countries, next],
        };
      });
      return id;
    },
    [update]
  );

  const importCountryLocations = useCallback(
    (countryId: string, geo: CountryGeoState[], mode: "merge" | "replace" = "merge") => {
      const built = buildLocationRows(countryId, geo);
      let statesAdded = 0;
      let districtsAdded = 0;

      update((prev) => {
        if (mode === "replace") {
          const existingStateIds = prev.states
            .filter((s) => s.countryId === countryId)
            .map((s) => s.id);
          statesAdded = built.states.length;
          districtsAdded = built.districts.length;
          return {
            ...prev,
            states: [
              ...prev.states.filter((s) => s.countryId !== countryId),
              ...built.states,
            ],
            districts: [
              ...prev.districts.filter((d) => !existingStateIds.includes(d.stateId)),
              ...built.districts,
            ],
          };
        }

        const nextStates = [...prev.states];
        const nextDistricts = [...prev.districts];
        const stateIdByName = new Map(
          prev.states
            .filter((s) => s.countryId === countryId)
            .map((s) => [s.name.toLowerCase(), s.id] as const)
        );

        let localStates = 0;
        let localDistricts = 0;

        for (const state of built.states) {
          const key = state.name.toLowerCase();
          let stateId = stateIdByName.get(key);
          if (!stateId) {
            nextStates.push(state);
            stateId = state.id;
            stateIdByName.set(key, stateId);
            localStates += 1;
          }

          const districtNames = built.districts
            .filter((d) => d.stateId === state.id)
            .map((d) => d.name);
          const existingDistrictNames = new Set(
            nextDistricts
              .filter((d) => d.stateId === stateId)
              .map((d) => d.name.toLowerCase())
          );

          for (const name of districtNames) {
            if (existingDistrictNames.has(name.toLowerCase())) continue;
            nextDistricts.push({ id: newId("d"), name, stateId });
            existingDistrictNames.add(name.toLowerCase());
            localDistricts += 1;
          }
        }

        statesAdded = localStates;
        districtsAdded = localDistricts;
        return { ...prev, states: nextStates, districts: nextDistricts };
      });

      return { statesAdded, districtsAdded };
    },
    [update]
  );

  const deleteCountry = useCallback(
    (id: string) =>
      update((prev) => {
        const stateIds = prev.states.filter((s) => s.countryId === id).map((s) => s.id);
        return {
          ...prev,
          countries: prev.countries.filter((c) => c.id !== id),
          states: prev.states.filter((s) => s.countryId !== id),
          districts: prev.districts.filter((d) => !stateIds.includes(d.stateId)),
        };
      }),
    [update]
  );

  const addState = useCallback(
    (name: string, countryId: string) =>
      update((prev) => {
        const trimmed = name.trim();
        if (
          prev.states.some(
            (s) => s.countryId === countryId && namesMatch(s.name, trimmed)
          )
        ) {
          return prev;
        }
        return {
          ...prev,
          states: [...prev.states, { id: newId("s"), name: trimmed, countryId }],
        };
      }),
    [update]
  );

  const editState = useCallback(
    (id: string, name: string, countryId: string) =>
      update((prev) => ({
        ...prev,
        states: prev.states.map((s) => (s.id === id ? { ...s, name, countryId } : s)),
      })),
    [update]
  );

  const deleteState = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        states: prev.states.filter((s) => s.id !== id),
        districts: prev.districts.filter((d) => d.stateId !== id),
      })),
    [update]
  );

  const addDistrict = useCallback(
    (name: string, stateId: string) =>
      update((prev) => {
        const trimmed = name.trim();
        if (
          prev.districts.some(
            (d) => d.stateId === stateId && namesMatch(d.name, trimmed)
          )
        ) {
          return prev;
        }
        return {
          ...prev,
          districts: [...prev.districts, { id: newId("d"), name: trimmed, stateId }],
        };
      }),
    [update]
  );

  const editDistrict = useCallback(
    (id: string, name: string, stateId: string) =>
      update((prev) => ({
        ...prev,
        districts: prev.districts.map((d) => (d.id === id ? { ...d, name, stateId } : d)),
      })),
    [update]
  );

  const deleteDistrict = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        districts: prev.districts.filter((d) => d.id !== id),
      })),
    [update]
  );

  const addParent = useCallback(
    (name: string) =>
      update((prev) => {
        const trimmed = name.trim();
        if (prev.parents.some((p) => namesMatch(p.name, trimmed))) return prev;
        return {
          ...prev,
          parents: [...prev.parents, { id: newId("p"), name: trimmed }],
        };
      }),
    [update]
  );

  const editParent = useCallback(
    (id: string, name: string) =>
      update((prev) => ({
        ...prev,
        parents: prev.parents.map((p) => (p.id === id ? { ...p, name } : p)),
      })),
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
    (name: string, parentId: string) =>
      update((prev) => {
        const trimmed = name.trim();
        if (
          prev.categories.some(
            (c) => c.parentId === parentId && namesMatch(c.name, trimmed)
          )
        ) {
          return prev;
        }
        return {
          ...prev,
          categories: [
            ...prev.categories,
            { id: newId("cat"), name: trimmed, parentId },
          ],
        };
      }),
    [update]
  );

  const editCategory = useCallback(
    (id: string, name: string, parentId: string) =>
      update((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === id ? { ...c, name, parentId } : c
        ),
        subcategories: prev.subcategories.map((sc) =>
          sc.categoryId === id ? { ...sc, parentId } : sc
        ),
      })),
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
    (name: string, categoryId: string) =>
      update((prev) => {
        const trimmed = name.trim();
        const category = prev.categories.find((c) => c.id === categoryId);
        if (!category) return prev;
        if (
          prev.subcategories.some(
            (sc) => sc.categoryId === categoryId && namesMatch(sc.name, trimmed)
          )
        ) {
          return prev;
        }
        return {
          ...prev,
          subcategories: [
            ...prev.subcategories,
            {
              id: newId("sc"),
              name: trimmed,
              parentId: category.parentId,
              categoryId,
            },
          ],
        };
      }),
    [update]
  );

  const editSubcategory = useCallback(
    (id: string, name: string, categoryId: string) =>
      update((prev) => {
        const category = prev.categories.find((c) => c.id === categoryId);
        return {
          ...prev,
          subcategories: prev.subcategories.map((sc) =>
            sc.id === id
              ? {
                  ...sc,
                  name,
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
    (name: string, type: string) =>
      update((prev) => {
        const trimmed = name.trim();
        if (
          prev.extraFilters.some(
            (ef) => ef.type === type && namesMatch(ef.name, trimmed)
          )
        ) {
          return prev;
        }
        return {
          ...prev,
          extraFilters: [
            ...prev.extraFilters,
            { id: newId("ef"), name: trimmed, type },
          ],
        };
      }),
    [update]
  );

  const editExtraFilter = useCallback(
    (id: string, name: string) =>
      update((prev) => ({
        ...prev,
        extraFilters: prev.extraFilters.map((ef) => (ef.id === id ? { ...ef, name } : ef)),
      })),
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
    (name: string, parentId: string, subcategoryId?: string) =>
      update((prev) => {
        const trimmed = name.trim();
        if (
          prev.featureFilters.some(
            (ff) => ff.parentId === parentId && namesMatch(ff.name, trimmed)
          )
        ) {
          return prev;
        }
        return {
          ...prev,
          featureFilters: [
            ...prev.featureFilters,
            {
              id: newId("ff"),
              name: trimmed,
              parentId,
              ...(subcategoryId ? { subcategoryId } : {}),
            },
          ],
        };
      }),
    [update]
  );

  const editFeatureFilter = useCallback(
    (id: string, name: string, parentId: string, subcategoryId?: string) =>
      update((prev) => ({
        ...prev,
        featureFilters: prev.featureFilters.map((ff) =>
          ff.id === id
            ? {
                ...ff,
                name,
                parentId,
                subcategoryId: subcategoryId || undefined,
              }
            : ff
        ),
      })),
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

export type { Country, State, District, ParentCategory, Subcategory };
