import {
  DEFAULT_CUSTOM_ITEMS,
  DEFAULT_EXTRA_TABS,
  DEFAULT_MAIN_TABS,
  DEFAULT_PROPERTY_TABS,
  mergeCustomItems,
  mergeExtraTabs,
  mergeMainTabs,
  isSubcategoryExtensionTab,
  resolveBuiltInMainTabId,
  type Country,
  type TaxonomyData,
} from "./taxonomy-types";

import {
  DINING_CATEGORIES,
  DINING_EXTRA_FILTERS,
  DINING_EXTRA_TABS,
  DINING_PARENT,
  DINING_PARENT_ID,
  DINING_SUBCATEGORIES,
} from "./dining-taxonomy-data";
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
      exchangeRateToAED: 0.98,
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
      exchangeRateToAED: 1.01,
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
  cities: [],
  parents: [
    { id: "p1", name: "Stays" },
    { id: "p2", name: "Experiences" },
    { id: "p3", name: "Events" },
    DINING_PARENT,
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
    { id: "cat-bbq", name: "BBQ Experience", parentId: "p2" },
    { id: "cat-tour", name: "Farm Tour", parentId: "p2" },
    { id: "cat-venue", name: "Venue", parentId: "p3" },
    ...DINING_CATEGORIES,
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
    { id: "sc11", name: "BBQ Experience", parentId: "p2", categoryId: "cat-bbq" },
    { id: "sc12", name: "Farm Tour", parentId: "p2", categoryId: "cat-tour" },
    { id: "sc13", name: "Wedding Venues", parentId: "p3", categoryId: "cat-venue" },
    { id: "sc14", name: "Party Lawns", parentId: "p3", categoryId: "cat-venue" },
    { id: "sc15", name: "Corporate Retreats", parentId: "p3", categoryId: "cat-venue" },
    { id: "sc16", name: "Private Events", parentId: "p3", categoryId: "cat-venue" },
    { id: "sc17", name: "Farmhouse Gatherings", parentId: "p3", categoryId: "cat-venue" },
    { id: "sc18", name: "Outdoor Lawns", parentId: "p3", categoryId: "cat-venue" },
    { id: "sc19", name: "Desert Venues", parentId: "p3", categoryId: "cat-venue" },
    ...DINING_SUBCATEGORIES,
  ],
  extraFilters: [
    { id: "ef1", name: "Swimming Pool", type: "amenity", parentId: "p1" },
    { id: "ef2", name: "BBQ Area", type: "amenity", parentId: "p1" },
    { id: "ef3", name: "WiFi", type: "amenity" },
    { id: "ef4", name: "Pet Friendly", type: "tag", parentId: "p1" },
    { id: "ef5", name: "Family Friendly", type: "tag" },
    { id: "ef6", name: "Instant Booking", type: "tag" },
    { id: "ef7", name: "Budget (under AED 500)", type: "priceRange" },
    { id: "ef8", name: "Mid-range (AED 500–1500)", type: "priceRange" },
    { id: "ef9", name: "Luxury (AED 1500+)", type: "priceRange" },
    { id: "ef10", name: "Horse Riding", type: "activity", parentId: "p1" },
    { id: "ef11", name: "Fruit Picking", type: "activity", parentId: "p1" },
    { id: "ef12", name: "Desert Safari", type: "activity", parentId: "p2" },
    // Events → Venue (scoped to parent p3)
    { id: "ev-ef1", name: "Air conditioning", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef2", name: "Wi-Fi", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef3", name: "Restrooms", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef4", name: "Bridal room", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef5", name: "Stage", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef6", name: "Dance floor", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef7", name: "Sound system", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef8", name: "Projector", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef9", name: "LED screen", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef10", name: "Catering facilities", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef11", name: "Kitchen", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef12", name: "Prayer room", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef13", name: "Outdoor area", type: "venueFacility", parentId: "p3" },
    { id: "ev-ef14", name: "Weddings", type: "suitableFor", parentId: "p3" },
    { id: "ev-ef15", name: "Engagements", type: "suitableFor", parentId: "p3" },
    { id: "ev-ef16", name: "Birthday parties", type: "suitableFor", parentId: "p3" },
    { id: "ev-ef17", name: "Corporate events", type: "suitableFor", parentId: "p3" },
    { id: "ev-ef18", name: "Conferences", type: "suitableFor", parentId: "p3" },
    { id: "ev-ef19", name: "Seminars", type: "suitableFor", parentId: "p3" },
    { id: "ev-ef20", name: "Private parties", type: "suitableFor", parentId: "p3" },
    { id: "ev-ef21", name: "Exhibitions", type: "suitableFor", parentId: "p3" },
    { id: "ev-ef22", name: "Parking available", type: "venueParking", parentId: "p3" },
    { id: "ev-ef23", name: "Valet parking", type: "venueParking", parentId: "p3" },
    { id: "ev-ef24", name: "Covered parking", type: "venueParking", parentId: "p3" },
    { id: "ev-ef25", name: "In-house catering", type: "venueCatering", parentId: "p3" },
    { id: "ev-ef26", name: "Outside catering allowed", type: "venueCatering", parentId: "p3" },
    { id: "ev-ef27", name: "Kitchen available", type: "venueCatering", parentId: "p3" },
    { id: "ev-ef28", name: "Outside decorators allowed", type: "venueRule", parentId: "p3" },
    { id: "ev-ef29", name: "Music / DJ allowed", type: "venueRule", parentId: "p3" },
    { id: "ev-ef30", name: "Alcohol allowed", type: "venueRule", parentId: "p3" },
    { id: "ev-ef31", name: "Smoking allowed", type: "venueRule", parentId: "p3" },
    { id: "ev-ef32", name: "Pets allowed", type: "venueRule", parentId: "p3" },
    ...DINING_EXTRA_FILTERS,
  ],
  featureFilters: [
    { id: "ff1", name: "Private Pool", parentId: "p1" },
    { id: "ff2", name: "Organic Garden", parentId: "p1" },
    { id: "ff3", name: "Kitchen Access", parentId: "p1" },
    { id: "ff4", name: "Heritage Tour", parentId: "p1" },
    { id: "ff5", name: "Guided Safari", parentId: "p2" },
    { id: "ff6", name: "Cooking Class", parentId: "p2" },
  ],
};

const EVENT_VENUE_EXTRA_TABS = [
  { id: "venueFacility", label: "Venue facilities", listingSection: "venueDetails" as const },
  { id: "suitableFor", label: "Suitable for", listingSection: "venueDetails" as const },
  { id: "venueParking", label: "Parking", listingSection: "venueOptions" as const },
  { id: "venueCatering", label: "Catering", listingSection: "venueOptions" as const },
  { id: "venueRule", label: "Rules", listingSection: "venueOptions" as const },
];

export const SEED_TAXONOMY: TaxonomyData = {
  mainTabs: [...DEFAULT_MAIN_TABS, ...DEFAULT_PROPERTY_TABS],
  extraTabs: [...DEFAULT_EXTRA_TABS, ...EVENT_VENUE_EXTRA_TABS, ...DINING_EXTRA_TABS],
  customItems: Object.fromEntries(
    Object.entries(DEFAULT_CUSTOM_ITEMS).map(([key, items]) => [
      key,
      items.map((item) => ({ ...item })),
    ])
  ),
  ...CORE,
};

const SEED_PARENT_IDS = new Set(SEED_TAXONOMY.parents.map((item) => item.id));
const SEED_CATEGORY_IDS = new Set(SEED_TAXONOMY.categories.map((item) => item.id));
const SEED_SUBCATEGORY_IDS = new Set(SEED_TAXONOMY.subcategories.map((item) => item.id));
const SEED_EXTRA_FILTER_IDS = new Set(SEED_TAXONOMY.extraFilters.map((item) => item.id));

const BUILT_IN_DELETE_LOCK_SUFFIX =
  "is built in and cannot be deleted. Turn Active off to hide it from listing forms and search.";

/** Built-in taxonomy rows are re-merged on save; block delete and explain why. */
export function taxonomyItemDeleteLockReason(
  collection: "parents" | "categories" | "subcategories" | "extraFilters",
  id: string,
  name: string
): string | null {
  const seedIds =
    collection === "parents"
      ? SEED_PARENT_IDS
      : collection === "categories"
        ? SEED_CATEGORY_IDS
        : collection === "subcategories"
          ? SEED_SUBCATEGORY_IDS
          : SEED_EXTRA_FILTER_IDS;
  if (!seedIds.has(id)) return null;
  return `"${name}" ${BUILT_IN_DELETE_LOCK_SUFFIX}`;
}

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

function dedupeExtraFilters(
  items: { id: string; name: string; type: string; parentId?: string; enabled?: boolean }[]
) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}::${item.parentId ?? ""}::${normalizeFilterName(item.name)}`;
    if (!normalizeFilterName(item.name) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Add seed filters/tabs that are missing from stored admin data (additive upgrades). */
function mergeMissingExtraFilters<T extends { id: string }>(stored: T[], seed: T[]): T[] {
  const ids = new Set(stored.map((item) => item.id));
  const missing = seed.filter((item) => !ids.has(item.id));
  return missing.length > 0 ? [...stored, ...missing] : stored;
}

function mergeEventVenueExtraTabs(
  tabs: { id: string; label: string; builtIn?: boolean; enabled?: boolean }[]
) {
  return mergeMissingExtraFilters(tabs, EVENT_VENUE_EXTRA_TABS);
}

function mergeDiningExtraTabs(
  tabs: { id: string; label: string; builtIn?: boolean; enabled?: boolean }[]
) {
  return mergeMissingExtraFilters(tabs, DINING_EXTRA_TABS);
}

function mergeMissingById<T extends { id: string }>(stored: T[], seed: T[]): T[] {
  const ids = new Set(stored.map((item) => item.id));
  const missing = seed.filter((item) => !ids.has(item.id));
  return missing.length > 0 ? [...stored, ...missing] : stored;
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

function normalizeParents(
  stored: TaxonomyData["parents"] | undefined
): TaxonomyData["parents"] {
  const source = stored == null ? SEED_TAXONOMY.parents : mergeMissingById(stored, SEED_TAXONOMY.parents);
  return dedupeByName(source);
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
  const source =
    stored == null
      ? SEED_TAXONOMY.categories
      : mergeMissingById(stored, SEED_TAXONOMY.categories);
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
  const source =
    stored == null
      ? SEED_TAXONOMY.subcategories
      : mergeMissingById(stored, SEED_TAXONOMY.subcategories);
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

const LEGACY_VENUE_CATEGORY_IDS = new Set([
  "cat-wedding",
  "cat-party",
  "cat-corp",
  "cat-private",
  "cat-gather",
  "cat-lawn",
  "cat-desert-v",
]);

const LEGACY_VENUE_CATEGORY_NAMES = new Set([
  "wedding venues",
  "party lawns",
  "corporate retreats",
  "private events",
  "farmhouse gatherings",
  "outdoor lawns",
  "desert venues",
]);

function remapLegacyParentId(id: string): string {
  if (id === "p3") return "p2";
  if (id === "p4") return "p3";
  return id;
}

function isLegacyVenuesParent(parent: TaxonomyData["parents"][number]): boolean {
  return parent.id === "p4" && /^venues?$/i.test(parent.name.trim());
}

function shouldMigrateSequentialParents(
  parents: TaxonomyData["parents"] | undefined
): boolean {
  if (!parents?.length) return false;
  const ids = new Set(parents.map((p) => p.id));
  if (parents.some(isLegacyVenuesParent)) return true;
  if (ids.has("p3") && !ids.has("p2")) {
    const p3 = parents.find((p) => p.id === "p3");
    return Boolean(p3 && /experience/i.test(p3.name));
  }
  return false;
}

function remapParentIdOnItems<T extends { parentId?: string }>(items: T[] | undefined): T[] | undefined {
  if (!items) return items;
  return items.map((item) =>
    item.parentId ? { ...item, parentId: remapLegacyParentId(item.parentId) } : item
  );
}

function collapseLegacyVenueCategories(
  categories: TaxonomyData["categories"],
  subcategories: TaxonomyData["subcategories"]
): {
  categories: TaxonomyData["categories"];
  subcategories: TaxonomyData["subcategories"];
} {
  const eventsParentId =
    SEED_TAXONOMY.parents.find((p) => /^events$/i.test(p.name))?.id ?? "p3";

  const isLegacyVenueCat = (cat: TaxonomyData["categories"][number]) =>
    LEGACY_VENUE_CATEGORY_IDS.has(cat.id) ||
    (cat.parentId === eventsParentId &&
      LEGACY_VENUE_CATEGORY_NAMES.has(normalizeFilterName(cat.name)));

  if (!categories.some(isLegacyVenueCat)) {
    return { categories, subcategories };
  }

  const existingVenue =
    categories.find((c) => c.id === "cat-venue") ??
    categories.find(
      (c) =>
        c.parentId === eventsParentId && normalizeFilterName(c.name) === "venue"
    );
  const venueCat = existingVenue
    ? { ...existingVenue, name: "Venue", parentId: eventsParentId }
    : { id: "cat-venue", name: "Venue", parentId: eventsParentId, enabled: true };

  const nextCategories = [
    ...categories.filter((c) => !isLegacyVenueCat(c) && c.id !== venueCat.id),
    venueCat,
  ];

  const nextSubcategories = subcategories.map((sc) => {
    const cat = categories.find((c) => c.id === sc.categoryId);
    if ((cat && isLegacyVenueCat(cat)) || LEGACY_VENUE_CATEGORY_IDS.has(sc.categoryId)) {
      return { ...sc, parentId: eventsParentId, categoryId: venueCat.id };
    }
    return sc;
  });

  return { categories: nextCategories, subcategories: nextSubcategories };
}

/**
 * Admin may create a Dining parent with an auto-generated id while seed dining
 * filters use `p-dining`. Canonicalize to one parent id and remap all children.
 */
function canonicalizeDiningParentTaxonomy(
  parsed: Partial<TaxonomyData>
): Partial<TaxonomyData> {
  const parents = parsed.parents ?? [];
  const legacyDiningIds = new Set(
    parents
      .filter(
        (p) =>
          normalizeFilterName(p.name) === "dining" && p.id !== DINING_PARENT_ID
      )
      .map((p) => p.id)
  );
  const orphanDiningFilters = (parsed.extraFilters ?? []).some(
    (ef) =>
      ef.parentId === DINING_PARENT_ID &&
      !parents.some((p) => p.id === DINING_PARENT_ID)
  );

  if (legacyDiningIds.size === 0 && !orphanDiningFilters) return parsed;

  const legacyParent = parents.find((p) => legacyDiningIds.has(p.id));
  const canonicalParent = {
    ...(parents.find((p) => p.id === DINING_PARENT_ID) ?? legacyParent ?? DINING_PARENT),
    id: DINING_PARENT_ID,
    name: "Dining",
  };

  const nextParents = [
    ...parents.filter(
      (p) => p.id !== DINING_PARENT_ID && !legacyDiningIds.has(p.id)
    ),
    canonicalParent,
  ];

  const remapParentId = (parentId?: string): string | undefined => {
    if (!parentId) return parentId;
    if (parentId === DINING_PARENT_ID || legacyDiningIds.has(parentId)) {
      return DINING_PARENT_ID;
    }
    return parentId;
  };

  const remapItems = <T extends { parentId?: string }>(items?: T[]): T[] | undefined =>
    items?.map((item) =>
      item.parentId
        ? { ...item, parentId: remapParentId(item.parentId) ?? item.parentId }
        : item
    );

  return {
    ...parsed,
    parents: nextParents,
    categories: remapItems(parsed.categories),
    subcategories: remapItems(parsed.subcategories),
    extraFilters: remapItems(parsed.extraFilters),
    featureFilters: remapItems(parsed.featureFilters),
  };
}

/** p3 Experiences → p2, p4 Venues → p3 Events; venue types become subcategories of Venue. */
function migrateLegacyParentTaxonomy(parsed: Partial<TaxonomyData>): Partial<TaxonomyData> {
  const diningCanonical = canonicalizeDiningParentTaxonomy(parsed);
  let parents = diningCanonical.parents;
  let categories = diningCanonical.categories;
  let subcategories = diningCanonical.subcategories;
  let extraFilters = diningCanonical.extraFilters;
  let featureFilters = diningCanonical.featureFilters;

  if (shouldMigrateSequentialParents(parents)) {
    parents = parents!.map((p) => {
      const id = remapLegacyParentId(p.id);
      const name = /^venues?$/i.test(p.name.trim()) ? "Events" : p.name;
      return { ...p, id, name };
    });
    categories = remapParentIdOnItems(categories);
    subcategories = remapParentIdOnItems(subcategories);
    extraFilters = remapParentIdOnItems(extraFilters);
    featureFilters = remapParentIdOnItems(featureFilters);
  } else if (parents?.some((p) => /^venues?$/i.test(p.name.trim()))) {
    parents = parents.map((p) =>
      /^venues?$/i.test(p.name.trim()) ? { ...p, name: "Events" } : p
    );
  }

  if (categories) {
    const collapsed = collapseLegacyVenueCategories(categories, subcategories ?? []);
    categories = collapsed.categories;
    if (subcategories) subcategories = collapsed.subcategories;
  }

  return {
    ...diningCanonical,
    ...(parents ? { parents } : {}),
    ...(categories ? { categories } : {}),
    ...(subcategories ? { subcategories } : {}),
    ...(extraFilters ? { extraFilters } : {}),
    ...(featureFilters ? { featureFilters } : {}),
  };
}

export function normalizeTaxonomy(parsed: Partial<TaxonomyData>): TaxonomyData {
  const extensionTabIds = new Set(
    (parsed.mainTabs ?? []).filter(isSubcategoryExtensionTab).map((tab) => tab.id)
  );
  const parsedWithoutExtensionTabs: Partial<TaxonomyData> = {
    ...parsed,
    mainTabs: (parsed.mainTabs ?? []).filter((tab) => !isSubcategoryExtensionTab(tab)),
  };
  if (extensionTabIds.size > 0) {
    const customItems = { ...(parsed.customItems ?? {}) };
    for (const id of Array.from(extensionTabIds)) {
      delete customItems[id];
    }
    parsedWithoutExtensionTabs.customItems = customItems;
  }

  const migrated = migrateLegacyParentTaxonomy(parsedWithoutExtensionTabs);
  const incoming: TaxonomyData = {
    ...SEED_TAXONOMY,
    ...migrated,
    parents: migrated.parents ?? SEED_TAXONOMY.parents,
    categories: migrated.categories ?? SEED_TAXONOMY.categories,
    subcategories: migrated.subcategories ?? SEED_TAXONOMY.subcategories,
    featureFilters: migrated.featureFilters ?? SEED_TAXONOMY.featureFilters,
  };

  const mainTabs = mergeMainTabs(parsedWithoutExtensionTabs.mainTabs);
  const parents = normalizeParents(incoming.parents);
  const categories = normalizeCategories(incoming.categories, parents);
  const customItems = dedupeCustomItems(
    mergeCustomItems(
      parsedWithoutExtensionTabs.customItems,
      parsedWithoutExtensionTabs.mainTabs,
      mainTabs
    )
  );

  // Promote items from legacy custom tabs named like "Sub Category" into real subcategories
  const { customItems: cleanedCustom, subcategories: fromAliases } =
    migrateBuiltInAliasCustomItems(
      parsed.mainTabs ?? [],
      customItems,
      incoming.subcategories ?? [],
      parents,
      categories
    );

  const merged: TaxonomyData = {
    ...SEED_TAXONOMY,
    ...migrated,
    mainTabs,
    extraTabs: mergeDiningExtraTabs(
      mergeEventVenueExtraTabs(mergeExtraTabs(migrated.extraTabs))
    ),
    customItems: cleanedCustom,
    extraFilters: dedupeExtraFilters(
      mergeMissingExtraFilters(
        migrated.extraFilters ?? [],
        SEED_TAXONOMY.extraFilters
      ).map((ef) =>
        ef.parentId
          ? { ...ef, parentId: remapToKnownParentId(ef.parentId, parents) }
          : ef
      )
    ),
    featureFilters: dedupeByNameAndParent(
      (incoming.featureFilters ?? SEED_TAXONOMY.featureFilters).map((ff) =>
        ff.parentId
          ? { ...ff, parentId: remapToKnownParentId(ff.parentId, parents) }
          : ff
      ),
      "parentId"
    ),
    countries: normalizeCountries(parsed.countries),
    states: dedupeByNameAndParent(parsed.states ?? SEED_TAXONOMY.states, "countryId"),
    districts: dedupeByNameAndParent(
      parsed.districts ?? SEED_TAXONOMY.districts,
      "stateId"
    ),
    cities: dedupeByNameAndParent(parsed.cities ?? [], "districtId"),
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const existing = normalizeTaxonomy(JSON.parse(raw) as TaxonomyData);
      if (JSON.stringify(existing) === JSON.stringify(normalized)) return;
    }
  } catch {
    // proceed with write
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  emitSyncCustomEvent(TAXONOMY_SYNC_EVENT);
}

/** Merge custom tabs from later sources into the first (shared DB + local + in-memory). */
export function mergeTaxonomySources(...sources: TaxonomyData[]): TaxonomyData {
  if (sources.length === 0) return SEED_TAXONOMY;
  let merged = sources[0];
  for (let i = 1; i < sources.length; i++) {
    merged = mergeApiTaxonomyWithLocal(merged, sources[i]);
  }
  return merged;
}

/** When shared DB is missing locally saved custom tabs, merge them back in. */
export function mergeApiTaxonomyWithLocal(
  api: TaxonomyData,
  local: TaxonomyData
): TaxonomyData {
  const apiTabIds = new Set(api.mainTabs.map((tab) => tab.id));
  const missingTabs = local.mainTabs.filter(
    (tab) => !apiTabIds.has(tab.id) && !isSubcategoryExtensionTab(tab)
  );
  if (missingTabs.length === 0) return normalizeTaxonomy(api);

  const customItems = { ...api.customItems };
  for (const tab of missingTabs) {
    const items = local.customItems[tab.id];
    if (items) customItems[tab.id] = items;
  }

  return normalizeTaxonomy({
    ...api,
    mainTabs: [...api.mainTabs, ...missingTabs],
    customItems,
  });
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeFilterName(a) === normalizeFilterName(b);
}
