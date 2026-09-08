export type BuiltInMainTab =
  | "country"
  | "state"
  | "district"
  | "city"
  | "parent"
  | "category"
  | "subcategory";

export interface FilterTab {
  id: string;
  label: string;
  builtIn?: boolean;
  /** Shown in search / listing filters. Defaults to true. */
  enabled?: boolean;
}

export interface Country {
  id: string;
  name: string;
  code?: string;
  flag?: string;
  currency?: string;
  currencySymbol?: string;
  exchangeRateToAED?: number;
  /** Default tax rate for listings in this country (host pricing). */
  taxPct?: number;
  /** Tax label shown at checkout (e.g. VAT, GST). */
  taxLabel?: string;
  dialCode?: string;
  /** Shown in search/listing filters. Defaults to true. */
  enabled?: boolean;
  /** Marketplace header switcher: disabled but listed as coming soon. */
  comingSoon?: boolean;
}

export type CountryInput = Omit<Country, "id"> & { id?: string };

export interface State {
  id: string;
  name: string;
  countryId: string;
  enabled?: boolean;
  /** Official admin code (India LGD state code). */
  code?: string;
  /** state | territory — used when mapping into Location.type */
  type?: string;
}

export interface District {
  id: string;
  name: string;
  stateId: string;
  enabled?: boolean;
  /** Official admin code (India LGD district code). */
  code?: string;
}

/** City/town under a district. Not globally unique — identity is districtId + name. */
export interface City {
  id: string;
  name: string;
  districtId: string;
  enabled?: boolean;
  code?: string;
}

export interface ParentCategory {
  id: string;
  name: string;
  enabled?: boolean;
}

/** Middle taxonomy level: Parent → Category → Sub Category. */
export interface Category {
  id: string;
  name: string;
  parentId: string;
  enabled?: boolean;
}

export interface Subcategory {
  id: string;
  name: string;
  parentId: string;
  categoryId: string;
  enabled?: boolean;
}

export interface ExtraFilter {
  id: string;
  name: string;
  type: string;
  /**
   * Optional parent category scope. Empty/undefined = shown for every parent
   * (Stays, Experiences, Venues). When set, only that parent sees the filter.
   */
  parentId?: string;
  enabled?: boolean;
}

export interface FeatureFilter {
  id: string;
  name: string;
  parentId: string;
  /** Optional: further limit to a sub category under the parent. */
  subcategoryId?: string;
  enabled?: boolean;
}

export interface CustomTabItem {
  id: string;
  name: string;
  enabled?: boolean;
  /** Optional: limit this item to a sub category. Empty = all. */
  subcategoryId?: string;
}

export interface TaxonomyData {
  mainTabs: FilterTab[];
  extraTabs: FilterTab[];
  countries: Country[];
  states: State[];
  districts: District[];
  cities: City[];
  parents: ParentCategory[];
  categories: Category[];
  subcategories: Subcategory[];
  extraFilters: ExtraFilter[];
  featureFilters: FeatureFilter[];
  customItems: Record<string, CustomTabItem[]>;
}

export const DEFAULT_MAIN_TABS: FilterTab[] = [
  { id: "country", label: "Country", builtIn: true },
  { id: "state", label: "State", builtIn: true },
  { id: "district", label: "District", builtIn: true },
  { id: "city", label: "City", builtIn: true },
  { id: "parent", label: "Parent Category", builtIn: true },
  { id: "category", label: "Category", builtIn: true },
  { id: "subcategory", label: "Sub Category", builtIn: true },
];

/** Always shown after subcategory (listing form or Pricing, depending on tab). */
export const DEFAULT_PROPERTY_TABS: FilterTab[] = [
  { id: "roomType", label: "Room Types" },
  { id: "bedrooms", label: "Bedrooms" },
  { id: "beds", label: "Beds" },
  { id: "baths", label: "Baths" },
  { id: "guests", label: "Guests" },
];

export const DEFAULT_CUSTOM_ITEMS: Record<string, CustomTabItem[]> = {
  roomType: [
    { id: "rt-entire", name: "Entire place" },
    { id: "rt-private", name: "Private room" },
    { id: "rt-shared", name: "Shared room" },
    { id: "rt-suite", name: "Suite" },
  ],
  bedrooms: ["1", "2", "3", "4", "5", "6", "7", "8"].map((n) => ({
    id: `br-${n}`,
    name: n,
  })),
  beds: ["1", "2", "3", "4", "5", "6", "7", "8", "10"].map((n) => ({
    id: `bed-${n}`,
    name: n,
  })),
  baths: ["1", "2", "3", "4", "5", "6"].map((n) => ({
    id: `bath-${n}`,
    name: n,
  })),
  guests: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"].map(
    (n) => ({
      id: `guest-${n}`,
      name: n,
    })
  ),
};

export const DEFAULT_EXTRA_TABS: FilterTab[] = [
  { id: "amenity", label: "Amenity", builtIn: true },
  { id: "tag", label: "Tag", builtIn: true },
  { id: "priceRange", label: "Price Range", builtIn: true },
  { id: "activity", label: "Activity", builtIn: true },
];

function normalizeTabLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match legacy admin-created tabs onto built-in main tab ids (e.g. "Sub Category" → subcategory). */
export function resolveBuiltInMainTabId(
  tab: Pick<FilterTab, "id" | "label">
): BuiltInMainTab | null {
  if (isBuiltInMainTab(tab.id)) return tab.id;
  const label = normalizeTabLabel(tab.label);
  if (/^countr(y|ies)$/.test(label)) return "country";
  if (/^states?(\s*\/\s*emirates)?$/.test(label) || /^emirates$/.test(label)) return "state";
  if (/^districts?$/.test(label)) return "district";
  if (/^cit(y|ies)$/.test(label)) return "city";
  if (/^parent(\s*categor(y|ies))?$/.test(label)) return "parent";
  if (/^sub[\s-]*categor(y|ies)$/.test(label)) return "subcategory";
  if (/^categor(y|ies)$/.test(label)) return "category";
  return null;
}

/** Match legacy admin-created tabs (e.g. "Room Type") to canonical property tab ids. */
export function resolvePropertyTabId(tab: Pick<FilterTab, "id" | "label">): string | null {
  if (DEFAULT_PROPERTY_TABS.some((t) => t.id === tab.id)) return tab.id;
  if (tab.id === "guests") return "guests";
  const label = normalizeTabLabel(tab.label);
  if (/^room\s*types?$/.test(label)) return "roomType";
  if (/^bedrooms?$/.test(label)) return "bedrooms";
  if (/^beds?$/.test(label)) return "beds";
  if (/^bath(s|rooms?)?$/.test(label)) return "baths";
  if (/^guests?$/.test(label) || /^max(\.|\s)?\s*guests?$/.test(label) || /^guest\s*capacity$/.test(label)) {
    return "guests";
  }
  return null;
}

/** Filter tabs configured on Host → Pricing instead of the listing create form. */
export const LISTING_FORM_EXCLUDED_TAB_IDS = new Set([
  "roomType",
  "beds",
  "baths",
  "bedrooms",
  "guests",
]);

export function isExcludedFromListingForm(tab: Pick<FilterTab, "id" | "label">): boolean {
  if (LISTING_FORM_EXCLUDED_TAB_IDS.has(tab.id)) return true;
  const resolved = resolvePropertyTabId(tab);
  return resolved !== null && LISTING_FORM_EXCLUDED_TAB_IDS.has(resolved);
}

export function isFilterEnabled(item: { enabled?: boolean } | null | undefined): boolean {
  return item?.enabled !== false;
}

export function filterEnabledItems<T extends { enabled?: boolean }>(items: T[]): T[] {
  return items.filter((item) => isFilterEnabled(item));
}

export function isBuiltInMainTab(id: string): id is BuiltInMainTab {
  return ["country", "state", "district", "city", "parent", "category", "subcategory"].includes(
    id
  );
}

export function isDefaultPropertyTab(id: string): boolean {
  return DEFAULT_PROPERTY_TABS.some((t) => t.id === id);
}

/** Keep admin Active/label overrides when re-merging built-in tabs. */
function mergeStoredTab(canonical: FilterTab, stored?: FilterTab): FilterTab {
  if (!stored) return { ...canonical };
  return {
    ...canonical,
    ...stored,
    id: canonical.id,
    builtIn: canonical.builtIn ?? stored.builtIn,
    label: stored.label?.trim() || canonical.label,
  };
}

export function dedupeTabsById(tabs: FilterTab[]): FilterTab[] {
  const seen = new Set<string>();
  return tabs.filter((tab) => {
    if (!tab.id || seen.has(tab.id)) return false;
    seen.add(tab.id);
    return true;
  });
}

export function mergeMainTabs(stored: FilterTab[] | undefined): FilterTab[] {
  const deduped = dedupeTabsById(stored ?? []);
  const byId = new Map(deduped.map((tab) => [tab.id, tab]));

  for (const builtIn of DEFAULT_MAIN_TABS) {
    byId.set(builtIn.id, mergeStoredTab(builtIn, byId.get(builtIn.id)));
  }

  const builtInIds = new Set(DEFAULT_MAIN_TABS.map((t) => t.id));
  const propertyIds = new Set(DEFAULT_PROPERTY_TABS.map((t) => t.id));

  // Map legacy label-matched tabs onto canonical property tab ids.
  const legacyToCanonical = new Map<string, string>();
  // Custom tabs that duplicate built-in names (e.g. "Sub Category") → drop, keep built-in
  const builtInAliasIds = new Set<string>();
  for (const tab of deduped) {
    if (builtInIds.has(tab.id) || propertyIds.has(tab.id)) continue;
    const builtIn = resolveBuiltInMainTabId(tab);
    if (builtIn) {
      builtInAliasIds.add(tab.id);
      // Prefer the custom label on the built-in tab when present
      const existing = byId.get(builtIn);
      if (existing && tab.label.trim()) {
        byId.set(builtIn, { ...existing, label: tab.label.trim() });
      }
      continue;
    }
    const canonical = resolvePropertyTabId(tab);
    if (canonical && !legacyToCanonical.has(canonical)) {
      legacyToCanonical.set(canonical, tab.id);
    }
  }

  const propertyTabs = DEFAULT_PROPERTY_TABS.map((canonical) => {
    const existing = byId.get(canonical.id);
    if (existing) {
      return mergeStoredTab(canonical, existing);
    }
    const legacyId = legacyToCanonical.get(canonical.id);
    if (legacyId) {
      const legacy = byId.get(legacyId)!;
      return mergeStoredTab(canonical, { ...legacy, id: canonical.id });
    }
    return { ...canonical };
  });

  const usedLegacyIds = new Set(legacyToCanonical.values());
  const otherCustom = dedupeCustomTabsByLabel(
    deduped.filter(
      (t) =>
        !builtInIds.has(t.id) &&
        !propertyIds.has(t.id) &&
        !usedLegacyIds.has(t.id) &&
        !builtInAliasIds.has(t.id)
    )
  );

  return [
    ...DEFAULT_MAIN_TABS.map((t) => byId.get(t.id)!),
    ...propertyTabs,
    ...otherCustom,
  ];
}

export function mergeCustomItems(
  stored: Record<string, CustomTabItem[]> | undefined,
  storedTabs: FilterTab[] | undefined,
  mergedTabs: FilterTab[]
): Record<string, CustomTabItem[]> {
  const next: Record<string, CustomTabItem[]> = { ...(stored ?? {}) };

  for (const tab of storedTabs ?? []) {
    const canonical = resolvePropertyTabId(tab);
    if (!canonical || canonical === tab.id) continue;
    if ((next[canonical] ?? []).length === 0 && (next[tab.id] ?? []).length > 0) {
      next[canonical] = next[tab.id];
    }
    delete next[tab.id];
  }

  for (const tab of DEFAULT_PROPERTY_TABS) {
    const defaults = DEFAULT_CUSTOM_ITEMS[tab.id] ?? [];
    if ((next[tab.id] ?? []).length === 0) {
      next[tab.id] = defaults.map((item) => ({ ...item }));
    }
  }

  for (const tab of mergedTabs) {
    if (tab.builtIn) continue;
    if (!next[tab.id]) next[tab.id] = [];
  }

  return next;
}

export function dedupeCustomTabsByLabel(tabs: FilterTab[]): FilterTab[] {
  const seen = new Set<string>();
  return tabs.filter((tab) => {
    const key = normalizeTabLabel(tab.label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeExtraTabs(stored: FilterTab[] | undefined): FilterTab[] {
  const deduped = dedupeTabsById(stored ?? []);
  const byId = new Map(deduped.map((tab) => [tab.id, tab]));

  for (const builtIn of DEFAULT_EXTRA_TABS) {
    byId.set(builtIn.id, mergeStoredTab(builtIn, byId.get(builtIn.id)));
  }

  const builtInIds = new Set(DEFAULT_EXTRA_TABS.map((t) => t.id));
  const custom = deduped.filter((t) => !builtInIds.has(t.id));
  return [...DEFAULT_EXTRA_TABS.map((t) => byId.get(t.id)!), ...dedupeCustomTabsByLabel(custom)];
}
