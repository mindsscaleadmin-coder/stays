import type { TaxonomyData } from "@/lib/admin/taxonomy-types";
import { isExcludedFromListingForm, isFilterEnabled } from "@/lib/admin/taxonomy-types";
import type { ListingFilterValues } from "./submission-types";

/** Amenity chips on the listing form are stored in advancedIds, not listing.amenities. */
export function countAmenitySelections(
  taxonomy: TaxonomyData,
  advancedIds: string[],
  legacyAmenities: string[] = []
): number {
  const amenityIds = new Set(
    taxonomy.extraFilters
      .filter((filter) => filter.type === "amenity")
      .map((filter) => filter.id)
  );
  const fromAdvanced = advancedIds.filter((id) => amenityIds.has(id)).length;
  return fromAdvanced + legacyAmenities.length;
}

export function countAmenitySelectionsFromNames(
  taxonomy: TaxonomyData,
  advancedFilterNames: string[],
  legacyAmenities: string[] = []
): number {
  const fromAdvanced = advancedFilterNames.filter((name) => {
    const normalized = name.trim().toLowerCase();
    const filter = taxonomy.extraFilters.find(
      (item) => item.name.trim().toLowerCase() === normalized
    );
    return filter?.type === "amenity";
  }).length;
  return fromAdvanced + legacyAmenities.length;
}

function tabOn(taxonomy: TaxonomyData, id: string) {
  return isFilterEnabled(taxonomy.mainTabs.find((t) => t.id === id));
}

export function validateListingFilters(
  taxonomy: TaxonomyData,
  values: ListingFilterValues
): string | null {
  if (tabOn(taxonomy, "country") && !values.countryId) return "Please select a country.";
  if (tabOn(taxonomy, "state") && !values.stateId) return "Please select a state.";
  if (tabOn(taxonomy, "district") && !values.districtId) return "Please select a district.";
  const districtCities = (taxonomy.cities ?? []).filter(
    (c) =>
      c.enabled !== false && values.districtId && c.districtId === values.districtId
  );
  if (tabOn(taxonomy, "city") && districtCities.length > 0 && !values.cityId) {
    return "Please select a city.";
  }
  if (tabOn(taxonomy, "parent") && !values.parentId) return "Please select a parent category.";
  if (tabOn(taxonomy, "category") && !values.categoryId) return "Please select a category.";
  if (tabOn(taxonomy, "subcategory") && !values.subcategoryId) {
    return "Please select a subcategory.";
  }

  if (values.parentId) {
    const parent = taxonomy.parents.find((p) => p.id === values.parentId);
    if (!parent || parent.enabled === false) return "Please select a valid parent category.";
  }

  if (values.categoryId) {
    const category = taxonomy.categories.find((c) => c.id === values.categoryId);
    if (
      !category ||
      category.enabled === false ||
      (values.parentId && category.parentId !== values.parentId)
    ) {
      return "Please select a category that matches the parent category.";
    }
  }

  if (values.subcategoryId) {
    const subcategory = taxonomy.subcategories.find((sc) => sc.id === values.subcategoryId);
    if (
      !subcategory ||
      subcategory.enabled === false ||
      (values.categoryId && subcategory.categoryId !== values.categoryId)
    ) {
      return "Please select a subcategory that matches the category.";
    }
  }

  for (const tab of taxonomy.mainTabs.filter(
    (t) => !t.builtIn && t.enabled !== false && !isExcludedFromListingForm(t)
  )) {
    const items = (taxonomy.customItems[tab.id] ?? []).filter((i) => i.enabled !== false);
    if (items.length > 0 && !values.customSelections[tab.id]) {
      return `Please select ${tab.label.toLowerCase()}.`;
    }
  }

  return null;
}

export function resolveListingLabels(
  taxonomy: TaxonomyData,
  values: ListingFilterValues
) {
  const country = taxonomy.countries.find((c) => c.id === values.countryId)?.name ?? "";
  const state = taxonomy.states.find((s) => s.id === values.stateId)?.name ?? "";
  const district = taxonomy.districts.find((d) => d.id === values.districtId)?.name ?? "";
  const city = (taxonomy.cities ?? []).find((c) => c.id === values.cityId)?.name ?? "";
  const parentCategory = taxonomy.parents.find((p) => p.id === values.parentId)?.name ?? "";
  const category = taxonomy.categories.find((c) => c.id === values.categoryId)?.name ?? "";
  const subcategory =
    taxonomy.subcategories.find((sc) => sc.id === values.subcategoryId)?.name ?? "";

  const customFilters = taxonomy.mainTabs
    .filter((tab) => !tab.builtIn && values.customSelections[tab.id])
    .map((tab) => {
      const itemId = values.customSelections[tab.id];
      const item = (taxonomy.customItems[tab.id] ?? []).find((i) => i.id === itemId);
      return { label: tab.label, value: item?.name ?? "" };
    })
    .filter((f) => f.value);

  const advancedFilters = values.advancedIds
    .map((id) => {
      const extra = taxonomy.extraFilters.find((ef) => ef.id === id)?.name;
      if (extra) return extra;
      return taxonomy.featureFilters.find((ff) => ff.id === id)?.name ?? "";
    })
    .filter(Boolean);

  const parent = parentCategory.toLowerCase();
  const type = parent.includes("experience")
    ? "experience"
    : parent.includes("homestay")
      ? "homestay"
      : parent.includes("venue") || /\bevents?\b/.test(parent)
        ? "venue"
        : "farmstay";

  return {
    country,
    state,
    district,
    parentCategory,
    category,
    subcategory,
    city: city || district,
    type,
    customFilters,
    advancedFilters,
  };
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/farm\s*house/g, "farmhouse")
    .replace(/\s+/g, " ");
}

function findByName<T extends { id: string; name: string }>(
  items: T[],
  name: string
): string {
  const normalized = normalizeName(name);
  return items.find((item) => normalizeName(item.name) === normalized)?.id ?? "";
}

/** Map stored listing labels back to taxonomy filter IDs for the edit form. */
export function listingToFilterValues(
  taxonomy: TaxonomyData,
  listing: {
    country: string;
    state: string;
    district: string;
    city?: string;
    parentCategory: string;
    category?: string;
    subcategory: string;
    customFilters: { label: string; value: string }[];
    advancedFilters: string[];
    highlightIds?: string[];
    featureIconIds?: string[];
  }
): ListingFilterValues {
  const countryId = findByName(taxonomy.countries, listing.country);
  const stateId = findByName(
    taxonomy.states.filter((s) => !countryId || s.countryId === countryId),
    listing.state
  );
  const districtId = findByName(
    taxonomy.districts.filter((d) => !stateId || d.stateId === stateId),
    listing.district
  );
  const cityId = findByName(
    (taxonomy.cities ?? []).filter((c) => !districtId || c.districtId === districtId),
    listing.city ?? ""
  );
  const parentId = findByName(
    taxonomy.parents.filter((p) => p.enabled !== false),
    listing.parentCategory
  );
  let categoryId = parentId
    ? findByName(
        taxonomy.categories.filter(
          (c) => c.enabled !== false && c.parentId === parentId
        ),
        listing.category ?? ""
      )
    : "";
  if (!categoryId && parentId && listing.subcategory) {
    categoryId =
      taxonomy.subcategories.find(
        (sc) =>
          sc.enabled !== false &&
          sc.parentId === parentId &&
          normalizeName(sc.name) === normalizeName(listing.subcategory)
      )?.categoryId ?? "";
  }
  const subcategoryId = categoryId
    ? findByName(
        taxonomy.subcategories.filter(
          (sc) => sc.enabled !== false && sc.categoryId === categoryId
        ),
        listing.subcategory
      )
    : "";

  const customSelections: Record<string, string> = {};
  for (const tab of taxonomy.mainTabs.filter((t) => !t.builtIn)) {
    const saved = listing.customFilters.find(
      (f) => f.label.toLowerCase() === tab.label.toLowerCase()
    );
    if (!saved) continue;
    const item = (taxonomy.customItems[tab.id] ?? []).find(
      (i) => i.name.toLowerCase() === saved.value.toLowerCase()
    );
    if (item) customSelections[tab.id] = item.id;
  }

  const advancedIds: string[] = [];
  for (const name of listing.advancedFilters) {
    const extra = taxonomy.extraFilters.find(
      (ef) => ef.name.toLowerCase() === name.toLowerCase()
    );
    if (extra) {
      advancedIds.push(extra.id);
      continue;
    }
    const feature = taxonomy.featureFilters.find(
      (ff) => ff.name.toLowerCase() === name.toLowerCase()
    );
    if (feature) advancedIds.push(feature.id);
  }

  return {
    countryId,
    stateId,
    districtId,
    cityId,
    parentId,
    categoryId,
    subcategoryId,
    customSelections,
    advancedIds,
    highlightIds: listing.highlightIds ?? [],
    featureIconIds: listing.featureIconIds ?? [],
  };
}
