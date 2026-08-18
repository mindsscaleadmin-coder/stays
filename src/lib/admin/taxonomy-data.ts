import {
  DEFAULT_CUSTOM_ITEMS,
  DEFAULT_EXTRA_TABS,
  DEFAULT_MAIN_TABS,
  DEFAULT_PROPERTY_TABS,
  mergeCustomItems,
  mergeExtraTabs,
  mergeMainTabs,
  resolveBuiltInMainTabId,
  type Country,
  type TaxonomyData,
} from "./taxonomy-types";

import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
const CORE: Omit<TaxonomyData, "mainTabs" | "extraTabs" | "customItems"> = {
  countries: [
    {
      id: "c1",
      name: "United Arab Emirates",
      code: "AE",
      flag: "🇦🇪",
      currency: "AED",
      currencySymbol: "د.إ",
      exchangeRateToAED: 1,
      taxPct: 5,
      taxLabel: "VAT",
      dialCode: "+971",
      enabled: true,
      comingSoon: false,
    },
    {
      id: "c2",
      name: "Saudi Arabia",
      code: "SA",
      flag: "🇸🇦",
      currency: "SAR",
      currencySymbol: "ر.س",
      exchangeRateToAED: 1,
      taxPct: 15,
      taxLabel: "VAT",
      dialCode: "+966",
      enabled: true,
      comingSoon: false,
    },
    {
      id: "c3",
      name: "Oman",
      code: "OM",
      flag: "🇴🇲",
      currency: "OMR",
      currencySymbol: "ر.ع.",
      exchangeRateToAED: 9.54,
      taxPct: 5,
      taxLabel: "VAT",
      dialCode: "+968",
      enabled: true,
      comingSoon: true,
    },
    {
      id: "c4",
      name: "Qatar",
      code: "QA",
      flag: "🇶🇦",
      currency: "QAR",
      currencySymbol: "ر.ق",
      exchangeRateToAED: 1,
      taxPct: 0,
      taxLabel: "VAT",
      dialCode: "+974",
      enabled: true,
      comingSoon: true,
    },
  ],
  states: [
    { id: "s1", name: "Abu Dhabi", countryId: "c1" },
    { id: "s2", name: "Dubai", countryId: "c1" },
    { id: "s3", name: "Sharjah", countryId: "c1" },
    { id: "s4", name: "Fujairah", countryId: "c1" },
    { id: "s5", name: "Riyadh", countryId: "c2" },
    { id: "s6", name: "AlUla", countryId: "c2" },
  ],
  districts: [
    { id: "d1", name: "Al Ain", stateId: "s1" },
    { id: "d2", name: "Al Dhafra", stateId: "s1" },
    { id: "d3", name: "Liwa", stateId: "s1" },
    { id: "d4", name: "Hatta", stateId: "s2" },
    { id: "d5", name: "Kalba", stateId: "s3" },
    { id: "d6", name: "Diriyah", stateId: "s5" },
    { id: "d7", name: "AlUla Old Town", stateId: "s6" },
  ],
  parents: [
    { id: "p1", name: "Stays" },
    { id: "p3", name: "Experiences" },
    { id: "p4", name: "Venues" },
  ],
  categories: [
    { id: "cat-farm", name: "Farm Stays", parentId: "p1" },
    { id: "cat-home", name: "Homestays", parentId: "p1" },
    { id: "cat-beach", name: "Beach Houses", parentId: "p1" },
    { id: "cat-bnb", name: "Bed & Breakfasts", parentId: "p1" },
    { id: "cat-boutique", name: "Boutique Stays", parentId: "p1" },
    { id: "cat-glamp", name: "Camping & Glamping", parentId: "p1" },
    { id: "cat-castle", name: "Castles & Manor Houses", parentId: "p1" },
    { id: "cat-chalet", name: "Chalet", parentId: "p1" },
    { id: "cat-cottage", name: "Cottages & Cabins", parentId: "p1" },
    { id: "cat-eco", name: "Eco Resorts / Non-Hotel Resorts", parentId: "p1" },
    { id: "cat-guest", name: "Guesthouses", parentId: "p1" },
    { id: "cat-heritage", name: "Heritage & Palace Stays", parentId: "p1" },
    { id: "cat-bbq", name: "BBQ Experience", parentId: "p3" },
    { id: "cat-tour", name: "Farm Tour", parentId: "p3" },
    { id: "cat-wedding", name: "Wedding Venues", parentId: "p4" },
    { id: "cat-party", name: "Party Lawns", parentId: "p4" },
    { id: "cat-corp", name: "Corporate Retreats", parentId: "p4" },
    { id: "cat-private", name: "Private Events", parentId: "p4" },
    { id: "cat-gather", name: "Farmhouse Gatherings", parentId: "p4" },
    { id: "cat-lawn", name: "Outdoor Lawns", parentId: "p4" },
    { id: "cat-desert-v", name: "Desert Venues", parentId: "p4" },
  ],
  subcategories: [
    { id: "sc1", name: "Luxury Farm House", parentId: "p1", categoryId: "cat-farm" },
    { id: "sc2", name: "Budget Farm Stay", parentId: "p1", categoryId: "cat-farm" },
    { id: "sc3", name: "Organic/Working Farm Stay", parentId: "p1", categoryId: "cat-farm" },
    { id: "sc4", name: "Vineyard Stay", parentId: "p1", categoryId: "cat-farm" },
    { id: "sc5", name: "Ranch Stay", parentId: "p1", categoryId: "cat-farm" },
    { id: "sc6", name: "Desert Camp", parentId: "p1", categoryId: "cat-glamp" },
    { id: "sc7", name: "Family Homestay", parentId: "p1", categoryId: "cat-home" },
    { id: "sc8", name: "Rural Homestay", parentId: "p1", categoryId: "cat-home" },
    { id: "sc9", name: "Urban Homestay", parentId: "p1", categoryId: "cat-home" },
    { id: "sc10", name: "Heritage Home", parentId: "p1", categoryId: "cat-home" },
    { id: "sc20", name: "Beach Houses", parentId: "p1", categoryId: "cat-beach" },
    { id: "sc21", name: "Bed & Breakfasts", parentId: "p1", categoryId: "cat-bnb" },
    { id: "sc22", name: "Boutique Stays", parentId: "p1", categoryId: "cat-boutique" },
    { id: "sc24", name: "Castles & Manor Houses", parentId: "p1", categoryId: "cat-castle" },
    { id: "sc25", name: "Chalet", parentId: "p1", categoryId: "cat-chalet" },
    { id: "sc26", name: "Cottages & Cabins", parentId: "p1", categoryId: "cat-cottage" },
    { id: "sc27", name: "Eco Resorts / Non-Hotel Resorts", parentId: "p1", categoryId: "cat-eco" },
    { id: "sc28", name: "Guesthouses", parentId: "p1", categoryId: "cat-guest" },
    { id: "sc29", name: "Heritage & Palace Stays", parentId: "p1", categoryId: "cat-heritage" },
    { id: "sc11", name: "BBQ Experience", parentId: "p3", categoryId: "cat-bbq" },
    { id: "sc12", name: "Farm Tour", parentId: "p3", categoryId: "cat-tour" },
    { id: "sc13", name: "Wedding Venues", parentId: "p4", categoryId: "cat-wedding" },
    { id: "sc14", name: "Party Lawns", parentId: "p4", categoryId: "cat-party" },
    { id: "sc15", name: "Corporate Retreats", parentId: "p4", categoryId: "cat-corp" },
    { id: "sc16", name: "Private Events", parentId: "p4", categoryId: "cat-private" },
    { id: "sc17", name: "Farmhouse Gatherings", parentId: "p4", categoryId: "cat-gather" },
    { id: "sc18", name: "Outdoor Lawns", parentId: "p4", categoryId: "cat-lawn" },
    { id: "sc19", name: "Desert Venues", parentId: "p4", categoryId: "cat-desert-v" },
  ],
  extraFilters: [
    { id: "ef1", name: "Swimming Pool", type: "amenity" },
    { id: "ef2", name: "BBQ Area", type: "amenity" },
    { id: "ef3", name: "WiFi", type: "amenity" },
    { id: "ef4", name: "Pet Friendly", type: "tag" },
    { id: "ef5", name: "Family Friendly", type: "tag" },
    { id: "ef6", name: "Instant Booking", type: "tag" },
    { id: "ef7", name: "Budget (under AED 500)", type: "priceRange" },
    { id: "ef8", name: "Mid-range (AED 500–1500)", type: "priceRange" },
    { id: "ef9", name: "Luxury (AED 1500+)", type: "priceRange" },
    { id: "ef10", name: "Horse Riding", type: "activity" },
    { id: "ef11", name: "Fruit Picking", type: "activity" },
    { id: "ef12", name: "Desert Safari", type: "activity" },
  ],
  featureFilters: [
    { id: "ff1", name: "Private Pool", parentId: "p1" },
    { id: "ff2", name: "Organic Garden", parentId: "p1" },
    { id: "ff3", name: "Kitchen Access", parentId: "p1" },
    { id: "ff4", name: "Heritage Tour", parentId: "p1" },
    { id: "ff5", name: "Guided Safari", parentId: "p3" },
    { id: "ff6", name: "Cooking Class", parentId: "p3" },
  ],
};

export const SEED_TAXONOMY: TaxonomyData = {
  mainTabs: [...DEFAULT_MAIN_TABS, ...DEFAULT_PROPERTY_TABS],
  extraTabs: DEFAULT_EXTRA_TABS,
  customItems: Object.fromEntries(
    Object.entries(DEFAULT_CUSTOM_ITEMS).map(([key, items]) => [
      key,
      items.map((item) => ({ ...item })),
    ])
  ),
  ...CORE,
};

/** Enrich stored countries with seed marketplace fields; keep user names and ids. */
function normalizeCountries(stored: Country[] | undefined): Country[] {
  if (stored == null) return SEED_TAXONOMY.countries.map((c) => ({ ...c }));

  const enriched = stored.map((c) => {
    const seed = SEED_TAXONOMY.countries.find(
      (s) => s.id === c.id || s.name.toLowerCase() === c.name.toLowerCase()
    );
    if (!seed) {
      return {
        enabled: true,
        comingSoon: false,
        exchangeRateToAED: 1,
        taxPct: 5,
        taxLabel: "VAT",
        ...c,
      };
    }
    return {
      ...seed,
      ...c,
      name: c.name,
      id: c.id,
    };
  });

  return dedupeByName(enriched);
}

const STORAGE_KEY = "farm-stays-taxonomy";

export const TAXONOMY_STORAGE_KEY = STORAGE_KEY;
export const TAXONOMY_SYNC_EVENT = "farm-stays-taxonomy-updated";

function reconcileDuplicateMainTabs(data: TaxonomyData): TaxonomyData {
  const builtInIds = new Set(DEFAULT_MAIN_TABS.map((t) => t.id));
  const labelToKeeper = new Map<string, string>();
  const dropIds = new Set<string>();
  const customItems = { ...data.customItems };

  for (const tab of data.mainTabs) {
    if (builtInIds.has(tab.id)) continue;
    const key = tab.label.trim().toLowerCase();
    const keeper = labelToKeeper.get(key);
    if (keeper) {
      dropIds.add(tab.id);
      customItems[keeper] = [...(customItems[keeper] ?? []), ...(customItems[tab.id] ?? [])];
      delete customItems[tab.id];
    } else {
      labelToKeeper.set(key, tab.id);
    }
  }

  if (dropIds.size === 0) return data;

  return {
    ...data,
    mainTabs: data.mainTabs.filter((tab) => !dropIds.has(tab.id)),
    customItems,
  };
}

function reconcileDuplicateExtraTabs(data: TaxonomyData): TaxonomyData {
  const builtInIds = new Set(DEFAULT_EXTRA_TABS.map((t) => t.id));
  const labelToKeeper = new Map<string, string>();
  const dropIds = new Set<string>();
  let extraFilters = data.extraFilters;

  for (const tab of data.extraTabs) {
    if (builtInIds.has(tab.id)) continue;
    const key = tab.label.trim().toLowerCase();
    const keeper = labelToKeeper.get(key);
    if (keeper) {
      dropIds.add(tab.id);
      extraFilters = extraFilters.map((ef) =>
        ef.type === tab.id ? { ...ef, type: keeper } : ef
      );
    } else {
      labelToKeeper.set(key, tab.id);
    }
  }

  if (dropIds.size === 0) return data;

  return {
    ...data,
    extraTabs: data.extraTabs.filter((tab) => !dropIds.has(tab.id)),
    extraFilters,
  };
}

function reconcileCountryNamedMainTabs(data: TaxonomyData): TaxonomyData {
  const reserved = new Set([
    ...DEFAULT_MAIN_TABS.map((t) => t.id),
    ...DEFAULT_PROPERTY_TABS.map((t) => t.id),
  ]);
  const countryNames = new Set(
    data.countries.map((c) => c.name.trim().toLowerCase()).filter(Boolean)
  );
  if (countryNames.size === 0) return data;

  const dropIds = new Set(
    data.mainTabs
      .filter(
        (tab) =>
          !reserved.has(tab.id) &&
          !tab.builtIn &&
          countryNames.has(tab.label.trim().toLowerCase())
      )
      .map((tab) => tab.id)
  );

  if (dropIds.size === 0) return data;

  const customItems = { ...data.customItems };
  Array.from(dropIds).forEach((id) => {
    delete customItems[id];
  });

  return {
    ...data,
    mainTabs: data.mainTabs.filter((tab) => !dropIds.has(tab.id)),
    customItems,
  };
}

function normalizeFilterName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeByName<T extends { id: string; name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeFilterName(item.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeByNameAndParent<
  T extends { id: string; name: string } & Record<P, string>,
  P extends string,
>(items: T[], parentKey: P): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item[parentKey]}::${normalizeFilterName(item.name)}`;
    if (!normalizeFilterName(item.name) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeCustomItems(
  customItems: Record<string, { id: string; name: string; enabled?: boolean }[]>
): Record<string, { id: string; name: string; enabled?: boolean }[]> {
  const next: Record<string, { id: string; name: string; enabled?: boolean }[]> = {};
  for (const [tabId, items] of Object.entries(customItems)) {
    next[tabId] = dedupeByName(items);
  }
  return next;
}

function parentKind(name: string): "stays" | "experiences" | "venues" | "other" {
  const n = normalizeFilterName(name);
  if (n === "stays" || n === "farm stays" || n === "farm stay") return "stays";
  if (n === "experiences" || n === "experience") return "experiences";
  if (n === "venues" || n === "venue") return "venues";
  return "other";
}

/**
 * Collapse extra stay-type parents (Beach Houses, Homestays, …) into categories
 * under Stays. Keep only Stays, Experiences, and Venues as parents.
 */
function collapseToThreeParents(data: TaxonomyData): TaxonomyData {
  const incoming = data.parents ?? [];
  if (incoming.length === 0) return data;

  const pick = (
    kind: "stays" | "experiences" | "venues",
    preferredId: string,
    name: string
  ) => {
    const match =
      incoming.find((p) => p.id === preferredId) ||
      incoming.find((p) => parentKind(p.name) === kind);
    return match ? { ...match, name } : null;
  };

  let stays = pick("stays", "p1", "Stays");
  const experiences = pick("experiences", "p3", "Experiences");
  const venues = pick("venues", "p4", "Venues");
  const keeperIdSet = new Set(
    [stays, experiences, venues].filter(Boolean).map((p) => p!.id)
  );

  const extras = incoming.filter((p) => !keeperIdSet.has(p.id));
  const stayTypeExtras = extras.filter((p) => parentKind(p.name) === "other");
  if (stayTypeExtras.length > 0 && !stays) {
    stays = { id: "p1", name: "Stays", enabled: true };
  }

  const keepers = [stays, experiences, venues].filter(
    (p): p is NonNullable<typeof p> => p != null
  );
  if (keepers.length === 0) return data;

  const fallbackId = stays?.id ?? keepers[0].id;

  const remapParentId = (parentId: string) => {
    if (stays && parentId === stays.id) return stays.id;
    if (experiences && parentId === experiences.id) return experiences.id;
    if (venues && parentId === venues.id) return venues.id;
    const src = incoming.find((p) => p.id === parentId);
    if (!src) return fallbackId;
    const kind = parentKind(src.name);
    if (kind === "experiences" && experiences) return experiences.id;
    if (kind === "venues" && venues) return venues.id;
    return fallbackId;
  };

  const categories = (data.categories ?? []).map((cat) => ({
    ...cat,
    parentId: remapParentId(cat.parentId),
  }));

  const seenCats = new Set(
    categories.map((cat) => `${cat.parentId}::${normalizeFilterName(cat.name)}`)
  );

  for (const extra of stayTypeExtras) {
    const key = `${fallbackId}::${normalizeFilterName(extra.name)}`;
    if (seenCats.has(key)) continue;
    categories.push({
      id: extra.id.startsWith("cat") ? extra.id : `cat-${extra.id}`,
      name: extra.name,
      parentId: fallbackId,
      enabled: extra.enabled,
    });
    seenCats.add(key);
  }

  const subcategories = (data.subcategories ?? []).map((sc) => ({
    ...sc,
    parentId: remapParentId(sc.parentId),
  }));

  const featureFilters = (data.featureFilters ?? []).map((ff) => ({
    ...ff,
    parentId: remapParentId(ff.parentId),
  }));

  return {
    ...data,
    parents: keepers,
    categories,
    subcategories,
    featureFilters,
  };
}

/** Keep stored parents. Seed only when nothing has been saved yet. */
function normalizeParents(
  stored: TaxonomyData["parents"] | undefined
): TaxonomyData["parents"] {
  if (stored == null) return dedupeByName(SEED_TAXONOMY.parents);
  return dedupeByName(stored);
}

function remapToKnownParentId(
  parentId: string,
  parents: TaxonomyData["parents"]
): string {
  const parentIds = new Set(parents.map((p) => p.id));
  if (parentIds.has(parentId)) return parentId;
  const seedParent = SEED_TAXONOMY.parents.find((p) => p.id === parentId);
  if (!seedParent) return parents[0]?.id ?? parentId;
  const parentIdByName = new Map(
    parents.map((p) => [normalizeFilterName(p.name), p.id] as const)
  );
  return parentIdByName.get(normalizeFilterName(seedParent.name)) ?? parents[0]?.id ?? parentId;
}

/** Keep stored categories and remap orphaned parentIds. Seed only when unset. */
function normalizeCategories(
  stored: TaxonomyData["categories"] | undefined,
  parents: TaxonomyData["parents"]
): TaxonomyData["categories"] {
  const source = stored ?? SEED_TAXONOMY.categories;
  const fromStored = source.map((cat) => ({
    ...cat,
    parentId: remapToKnownParentId(cat.parentId, parents),
  }));

  return dedupeByNameAndParent(fromStored, "parentId");
}

function resolveCategoryId(
  sc: { name: string; parentId: string; categoryId?: string },
  categories: TaxonomyData["categories"]
): string {
  if (sc.categoryId && categories.some((c) => c.id === sc.categoryId)) {
    return sc.categoryId;
  }
  const seed = SEED_TAXONOMY.subcategories.find(
    (s) => normalizeFilterName(s.name) === normalizeFilterName(sc.name)
  );
  if (seed) {
    const seedCat = SEED_TAXONOMY.categories.find((c) => c.id === seed.categoryId);
    const match =
      categories.find((c) => c.id === seed.categoryId) ||
      (seedCat
        ? categories.find(
            (c) =>
              normalizeFilterName(c.name) === normalizeFilterName(seedCat.name) &&
              c.parentId === sc.parentId
          )
        : undefined);
    if (match) return match.id;
  }
  const sameName = categories.find(
    (c) =>
      normalizeFilterName(c.name) === normalizeFilterName(sc.name) &&
      c.parentId === sc.parentId
  );
  if (sameName) return sameName.id;
  return categories.find((c) => c.parentId === sc.parentId)?.id ?? categories[0]?.id ?? "";
}

/** Keep stored subcategories and remap orphaned parent/category ids. Seed only when unset. */
function normalizeSubcategories(
  stored: TaxonomyData["subcategories"] | undefined,
  parents: TaxonomyData["parents"],
  categories: TaxonomyData["categories"]
): TaxonomyData["subcategories"] {
  const source = stored ?? SEED_TAXONOMY.subcategories;
  const fromStored = source.map((sc) => {
    const parentId = remapToKnownParentId(sc.parentId, parents);
    const categoryId = resolveCategoryId({ ...sc, parentId }, categories);
    const category = categories.find((c) => c.id === categoryId);
    return {
      ...sc,
      parentId: category?.parentId ?? parentId,
      categoryId,
    };
  });

  return dedupeByNameAndParent(
    fromStored.filter((sc) => Boolean(sc.categoryId)),
    "categoryId"
  );
}

export function normalizeTaxonomy(parsed: Partial<TaxonomyData>): TaxonomyData {
  const collapsed = collapseToThreeParents({
    ...SEED_TAXONOMY,
    ...parsed,
    parents: parsed.parents ?? SEED_TAXONOMY.parents,
    categories: parsed.categories ?? SEED_TAXONOMY.categories,
    subcategories: parsed.subcategories ?? SEED_TAXONOMY.subcategories,
    featureFilters: parsed.featureFilters ?? SEED_TAXONOMY.featureFilters,
  });

  const mainTabs = mergeMainTabs(parsed.mainTabs);
  const parents = normalizeParents(collapsed.parents);
  const categories = normalizeCategories(collapsed.categories, parents);
  const customItems = dedupeCustomItems(
    mergeCustomItems(parsed.customItems, parsed.mainTabs, mainTabs)
  );

  // Promote items from legacy custom tabs named like "Sub Category" into real subcategories
  const { customItems: cleanedCustom, subcategories: fromAliases } =
    migrateBuiltInAliasCustomItems(
      parsed.mainTabs ?? [],
      customItems,
      collapsed.subcategories ?? [],
      parents,
      categories
    );

  const merged: TaxonomyData = {
    ...SEED_TAXONOMY,
    ...parsed,
    mainTabs,
    extraTabs: mergeExtraTabs(parsed.extraTabs),
    customItems: cleanedCustom,
    extraFilters: dedupeByNameAndParent(
      parsed.extraFilters ?? SEED_TAXONOMY.extraFilters,
      "type"
    ),
    featureFilters: dedupeByNameAndParent(
      collapsed.featureFilters ?? SEED_TAXONOMY.featureFilters,
      "parentId"
    ),
    countries: normalizeCountries(parsed.countries),
    states: dedupeByNameAndParent(parsed.states ?? SEED_TAXONOMY.states, "countryId"),
    districts: dedupeByNameAndParent(
      parsed.districts ?? SEED_TAXONOMY.districts,
      "stateId"
    ),
    parents,
    categories,
    subcategories: normalizeSubcategories(fromAliases, parents, categories),
  };

  return reconcileCountryNamedMainTabs(
    reconcileDuplicateExtraTabs(reconcileDuplicateMainTabs(merged))
  );
}

/** Move flat custom-tab items that aliased built-in Sub Category into parent-scoped subcategories. */
function migrateBuiltInAliasCustomItems(
  storedTabs: TaxonomyData["mainTabs"],
  customItems: TaxonomyData["customItems"],
  existingSubs: TaxonomyData["subcategories"],
  parents: TaxonomyData["parents"],
  categories: TaxonomyData["categories"]
): {
  customItems: TaxonomyData["customItems"];
  subcategories: TaxonomyData["subcategories"];
} {
  const nextCustom = { ...customItems };
  const nextSubs = [...existingSubs];
  const defaultParentId = parents.find((p) => /^stays$/i.test(p.name))?.id ?? parents[0]?.id ?? "";
  const defaultCategoryId =
    categories.find((c) => c.parentId === defaultParentId)?.id ?? categories[0]?.id ?? "";

  for (const tab of storedTabs) {
    const builtIn = resolveBuiltInMainTabId(tab);
    if (!builtIn || tab.id === builtIn) continue;
    const items = nextCustom[tab.id] ?? [];
    if (builtIn === "subcategory" && defaultParentId && defaultCategoryId) {
      for (const item of items) {
        const exists = nextSubs.some(
          (sc) =>
            sc.categoryId === defaultCategoryId &&
            normalizeFilterName(sc.name) === normalizeFilterName(item.name)
        );
        if (!exists) {
          nextSubs.push({
            id: item.id.startsWith("sc") ? item.id : `sc-${item.id}`,
            name: item.name,
            parentId: defaultParentId,
            categoryId: defaultCategoryId,
            enabled: item.enabled,
          });
        }
      }
    }
    delete nextCustom[tab.id];
  }

  // Drop customItems for tabs that no longer exist on the merged main tab list
  return { customItems: nextCustom, subcategories: nextSubs };
}

export function loadTaxonomy(): TaxonomyData {
  if (typeof window === "undefined") return SEED_TAXONOMY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_TAXONOMY;
    const parsed = JSON.parse(raw) as Partial<TaxonomyData>;
    const normalized = normalizeTaxonomy(parsed);
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return SEED_TAXONOMY;
  }
}

export function saveTaxonomy(data: TaxonomyData): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeTaxonomy(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  emitSyncCustomEvent(TAXONOMY_SYNC_EVENT);
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeFilterName(a) === normalizeFilterName(b);
}
