"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import {
  DEFAULT_CUSTOM_ITEMS,
  findPropertyTab,
  isExcludedFromListingForm,
  isFilterEnabled,
  isSubcategoryExtensionTab,
  mergeMainTabs,
  PROPERTY_TAB_CANONICAL_ORDER,
  resolvePropertyTabId,
} from "@/lib/admin/taxonomy-types";
import type { FilterTab } from "@/lib/admin/taxonomy-types";
import { extraFilterMatchesScope } from "@/lib/admin/extra-filter-scope";
import type { ListingFilterValues } from "@/lib/listings/submission-types";
import { EMPTY_LISTING_FILTERS } from "@/lib/listings/submission-types";
import { ListingHighlightsField } from "@/components/dashboard/listing-highlights-field";
import { ListingFeatureIconsField } from "@/components/dashboard/listing-feature-icons-field";

const selectClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400";

function tabLabel(tabs: { id: string; label: string }[], id: string, fallback: string) {
  return tabs.find((t) => t.id === id)?.label ?? fallback;
}

function isTabEnabled(tabs: { id: string; enabled?: boolean }[], id: string) {
  const tab = tabs.find((t) => t.id === id);
  return isFilterEnabled(tab);
}

function FilterSelect({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  hint,
  hideLabel = false,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  hideLabel?: boolean;
}) {
  return (
    <div>
      {!hideLabel && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        aria-label={hideLabel ? label : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="" disabled hidden>
          {hideLabel ? label : placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !hideLabel ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  );
}

export function ListingFilterFields({
  values = EMPTY_LISTING_FILTERS,
  onChange,
  hideParent = false,
  hideCategoryLocation = false,
  hideSectionHeadings = false,
  hideAdvancedFilters = false,
  renderLayout,
}: {
  values?: ListingFilterValues;
  onChange: (values: ListingFilterValues) => void;
  /** Hide parent category — used when parent is chosen before the listing form. */
  hideParent?: boolean;
  /** Hide category, subcategory, and location dropdowns (country → city). */
  hideCategoryLocation?: boolean;
  /** Hide "Category" and "Location" section headings (fields stay visible). */
  hideSectionHeadings?: boolean;
  /** Hide the Advanced filters block in extras. */
  hideAdvancedFilters?: boolean;
  /** Insert content (e.g. title & description) between category/location and extras. */
  renderLayout?: (sections: {
    categoryLocation: ReactNode;
    extras: ReactNode;
  }) => ReactNode;
}) {
  const { data } = useAdminTaxonomy();
  const safeValues = values ?? EMPTY_LISTING_FILTERS;
  const {
    countryId,
    stateId,
    districtId,
    cityId,
    parentId,
    categoryId,
    subcategoryId,
    customSelections,
    advancedIds,
    highlightIds,
    featureIconIds,
  } = safeValues;

  function patch(partial: Partial<ListingFilterValues>) {
    onChange({ ...safeValues, ...partial });
  }

  const showCountry = isTabEnabled(data.mainTabs, "country");
  const showState = isTabEnabled(data.mainTabs, "state");
  const showDistrict = isTabEnabled(data.mainTabs, "district");
  const showCity = isTabEnabled(data.mainTabs, "city");
  const showParent = isTabEnabled(data.mainTabs, "parent");
  const showCategory = isTabEnabled(data.mainTabs, "category");
  const showSubcategory = isTabEnabled(data.mainTabs, "subcategory");

  const orderedMainTabs = useMemo(() => mergeMainTabs(data.mainTabs), [data.mainTabs]);

  const customMainTabs = useMemo(
    () =>
      orderedMainTabs.filter(
        (tab) =>
          !tab.builtIn && tab.enabled !== false && !isExcludedFromListingForm(tab)
      ),
    [orderedMainTabs]
  );

  const otherCustomMainTabs = useMemo(
    () => customMainTabs.filter((tab) => !isSubcategoryExtensionTab(tab)),
    [customMainTabs]
  );

  const countries = useMemo(() => filterActiveCountries(data.countries), [data.countries]);

  const states = useMemo(
    () =>
      data.states.filter(
        (s) => s.enabled !== false && (!countryId || s.countryId === countryId)
      ),
    [data.states, countryId]
  );

  const districts = useMemo(
    () =>
      data.districts.filter(
        (d) => d.enabled !== false && (!stateId || d.stateId === stateId)
      ),
    [data.districts, stateId]
  );

  const cities = useMemo(
    () =>
      (data.cities ?? []).filter(
        (c) => c.enabled !== false && districtId && c.districtId === districtId
      ),
    [data.cities, districtId]
  );

  const parents = useMemo(
    () => data.parents.filter((p) => p.enabled !== false),
    [data.parents]
  );

  const categories = useMemo(
    () =>
      parentId
        ? data.categories.filter(
            (c) => c.enabled !== false && c.parentId === parentId
          )
        : [],
    [data.categories, parentId]
  );

  /** Sub categories always scoped to the selected category — never show the full list. */
  const subcategories = useMemo(
    () =>
      categoryId
        ? data.subcategories.filter(
            (sc) => sc.enabled !== false && sc.categoryId === categoryId
          )
        : [],
    [data.subcategories, categoryId]
  );

  const extraTabs = useMemo(
    () => data.extraTabs.filter((t) => t.enabled !== false),
    [data.extraTabs]
  );

  const extraFilters = useMemo(
    () => data.extraFilters.filter((f) => f.enabled !== false),
    [data.extraFilters]
  );

  const featureFilters = useMemo(
    () => data.featureFilters.filter((f) => f.enabled !== false),
    [data.featureFilters]
  );

  useEffect(() => {
    let next = { ...safeValues };
    let changed = false;

    if (countryId && !data.countries.some((c) => c.id === countryId && c.enabled !== false)) {
      next = { ...next, countryId: "", stateId: "", districtId: "", cityId: "" };
      changed = true;
    }
    if (
      stateId &&
      !data.states.some(
        (s) =>
          s.id === stateId &&
          s.enabled !== false &&
          (!next.countryId || s.countryId === next.countryId)
      )
    ) {
      next = { ...next, stateId: "", districtId: "", cityId: "" };
      changed = true;
    }
    if (
      districtId &&
      !data.districts.some(
        (d) =>
          d.id === districtId &&
          d.enabled !== false &&
          (!next.stateId || d.stateId === next.stateId)
      )
    ) {
      next = { ...next, districtId: "", cityId: "" };
      changed = true;
    }
    if (
      cityId &&
      !(data.cities ?? []).some(
        (c) =>
          c.id === cityId &&
          c.enabled !== false &&
          (!next.districtId || c.districtId === next.districtId)
      )
    ) {
      next = { ...next, cityId: "" };
      changed = true;
    }
    if (parentId && !data.parents.some((p) => p.id === parentId && p.enabled !== false)) {
      next = { ...next, parentId: "", categoryId: "", subcategoryId: "" };
      changed = true;
    }

    const activeParentId = next.parentId;
    const activeCategoryId = next.categoryId;
    const catOk =
      !!activeCategoryId &&
      data.categories.some(
        (c) =>
          c.id === activeCategoryId &&
          c.enabled !== false &&
          !!activeParentId &&
          c.parentId === activeParentId
      );
    if (activeCategoryId && !catOk) {
      next = { ...next, categoryId: "", subcategoryId: "" };
      changed = true;
    }

    const activeSubId = next.subcategoryId;
    const subOk =
      !!activeSubId &&
      data.subcategories.some(
        (sc) =>
          sc.id === activeSubId &&
          sc.enabled !== false &&
          !!next.categoryId &&
          sc.categoryId === next.categoryId
      );
    if (activeSubId && !subOk) {
      next = { ...next, subcategoryId: "" };
      changed = true;
    }

    const extraTabOn = (type: string) =>
      data.extraTabs.some((t) => t.id === type && t.enabled !== false);
    const filteredAdvanced = advancedIds.filter((id) => {
      if (
        data.extraFilters.some(
          (ef) =>
            ef.id === id &&
            ef.enabled !== false &&
            extraTabOn(ef.type) &&
            extraFilterMatchesScope(ef, {
              parentId: activeParentId,
              categoryId: activeCategoryId,
              subcategoryId: next.subcategoryId,
            })
        )
      ) {
        return true;
      }
      const feature = data.featureFilters.find((ff) => ff.id === id);
      if (!feature || feature.enabled === false) return false;
      return !activeParentId || feature.parentId === activeParentId;
    });
    if (filteredAdvanced.length !== advancedIds.length) {
      next = { ...next, advancedIds: filteredAdvanced };
      changed = true;
    }

    const nextCustom = { ...customSelections };
    for (const [tabId, itemId] of Object.entries(customSelections)) {
      const tab = data.mainTabs.find((t) => t.id === tabId);
      if (!tab || tab.enabled === false) {
        delete nextCustom[tabId];
        changed = true;
        continue;
      }
      const items = data.customItems[tabId] ?? [];
      if (
        !items.some(
          (item) =>
            item.id === itemId &&
            item.enabled !== false &&
            (!item.subcategoryId ||
              !subcategoryId ||
              item.subcategoryId === subcategoryId)
        )
      ) {
        delete nextCustom[tabId];
        changed = true;
      }
    }

    if (changed) {
      onChange({ ...next, customSelections: nextCustom });
    }
    // Re-sync when taxonomy or cascade parents change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, countryId, stateId, districtId, cityId, parentId, categoryId, subcategoryId]);

  function toggleAdvanced(id: string) {
    patch({
      advancedIds: advancedIds.includes(id)
        ? advancedIds.filter((x) => x !== id)
        : [...advancedIds, id],
    });
  }

  const categoryHint = !parentId
    ? hideParent
      ? undefined
      : "Select a parent category first."
    : categories.length === 0
      ? "No categories for this parent yet — add them in Admin → Settings → Filter."
      : undefined;

  const subcategoryHint = !categoryId
    ? "Select a category first."
    : subcategories.length === 0
      ? "No sub categories for this category yet — add them in Admin → Settings → Filter."
      : undefined;

  const hideFilterNames = hideSectionHeadings;

  function renderCustomTabSelect(tab: FilterTab) {
    const items = [...(data.customItems[tab.id] ?? [])]
      .filter((i) => i.enabled !== false)
      .filter(
        (i) => !i.subcategoryId || !subcategoryId || i.subcategoryId === subcategoryId
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      );

    return (
      <FilterSelect
        key={tab.id}
        hideLabel={hideFilterNames}
        label={tab.label}
        id={`listing-${tab.id}`}
        value={customSelections[tab.id] ?? ""}
        onChange={(value) =>
          patch({
            customSelections: { ...customSelections, [tab.id]: value },
          })
        }
        options={items.map((item) => ({ value: item.id, label: item.name }))}
        placeholder={items.length ? `Select ${tab.label.toLowerCase()}` : "No options yet"}
        disabled={items.length === 0}
      />
    );
  }

  const categoryLocationSection = !hideCategoryLocation ? (
    <div className="space-y-5">
      {(showParent && !hideParent) || showCategory || showSubcategory ? (
        <div>
          {!hideFilterNames && (
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Category</h4>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {showParent && !hideParent && (
              <FilterSelect
                hideLabel={hideFilterNames}
                label={tabLabel(data.mainTabs, "parent", "Parent Category")}
                id="listing-parent"
                value={parentId}
                onChange={(v) => {
                  const nextAdvanced = advancedIds.filter((id) => {
                    const feature = data.featureFilters.find((ff) => ff.id === id);
                    if (!feature) return true;
                    return feature.parentId === v;
                  });
                  patch({
                    parentId: v,
                    categoryId: "",
                    subcategoryId: "",
                    advancedIds: nextAdvanced,
                  });
                }}
                options={parents.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select parent category"
              />
            )}
            {showCategory && (
              <FilterSelect
                hideLabel={hideFilterNames}
                label={tabLabel(data.mainTabs, "category", "Category")}
                id="listing-category"
                value={categoryId}
                onChange={(v) => patch({ categoryId: v, subcategoryId: "" })}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={
                  !parentId
                    ? hideParent
                      ? "Loading category options…"
                      : "Select parent category first"
                    : categories.length === 0
                      ? "No categories available"
                      : "Select category"
                }
                disabled={!parentId || categories.length === 0}
                hint={categoryHint}
              />
            )}
            {showSubcategory && (
              <FilterSelect
                hideLabel={hideFilterNames}
                label={tabLabel(data.mainTabs, "subcategory", "Sub Category")}
                id="listing-subcategory"
                value={subcategoryId}
                onChange={(v) => patch({ subcategoryId: v })}
                options={subcategories.map((sc) => ({ value: sc.id, label: sc.name }))}
                placeholder={
                  !categoryId
                    ? "Select category first"
                    : subcategories.length === 0
                      ? "No sub categories available"
                      : "Select sub category"
                }
                disabled={!categoryId || subcategories.length === 0}
                hint={subcategoryHint}
              />
            )}
          </div>
        </div>
      ) : null}

      {(showCountry || showState || showDistrict || showCity || otherCustomMainTabs.length > 0) && (
        <div>
          {!hideFilterNames && (
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Location &amp; category</h4>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {showCountry && (
          <FilterSelect
            hideLabel={hideFilterNames}
            label={tabLabel(data.mainTabs, "country", "Country")}
            id="listing-country"
            value={countryId}
            onChange={(v) => patch({ countryId: v, stateId: "", districtId: "", cityId: "" })}
            options={countries.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select country"
          />
        )}
        {showState && (
          <FilterSelect
            hideLabel={hideFilterNames}
            label={tabLabel(data.mainTabs, "state", "State")}
            id="listing-state"
            value={stateId}
            onChange={(v) => patch({ stateId: v, districtId: "", cityId: "" })}
            options={states.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Select state"
            disabled={!countryId || states.length === 0}
          />
        )}
        {showDistrict && (
          <FilterSelect
            hideLabel={hideFilterNames}
            label={tabLabel(data.mainTabs, "district", "District")}
            id="listing-district"
            value={districtId}
            onChange={(v) => patch({ districtId: v, cityId: "" })}
            options={districts.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Select district"
            disabled={!stateId || districts.length === 0}
          />
        )}
        {showCity && (
          <FilterSelect
            hideLabel={hideFilterNames}
            label={tabLabel(data.mainTabs, "city", "City")}
            id="listing-city"
            value={cityId}
            onChange={(v) => patch({ cityId: v })}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            placeholder={
              !districtId
                ? "Select district first"
                : cities.length === 0
                  ? "No cities for this district yet"
                  : "Select city"
            }
            disabled={!districtId || cities.length === 0}
            hint={
              districtId && cities.length === 0
                ? "Optional until cities are added under this district in Admin → Filter → City."
                : undefined
            }
          />
        )}
        {otherCustomMainTabs.map(renderCustomTabSelect)}
          </div>
        </div>
      )}
    </div>
  ) : null;

  const extrasSection = (
    <>
      <ListingFeatureIconsField
        selectedIds={featureIconIds}
        onChange={(ids) => patch({ featureIconIds: ids })}
        taxonomy={{ parentId, categoryId, subcategoryId }}
      />

      <ListingHighlightsField
        selectedIds={highlightIds}
        onChange={(ids) => patch({ highlightIds: ids })}
        taxonomy={{ parentId, categoryId, subcategoryId }}
      />

      {!hideAdvancedFilters && (
      <div className="pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-900">Advanced filters</h4>
        </div>

        {extraTabs.length === 0 && featureFilters.length === 0 ? (
          <p className="text-sm text-gray-400">No advanced filters configured.</p>
        ) : (
          <div className="space-y-4">
            {extraTabs.map((tab) => {
              const items = extraFilters.filter(
                (ef) =>
                  ef.type === tab.id &&
                  extraFilterMatchesScope(ef, {
                    parentId: parentId || null,
                    categoryId: categoryId || null,
                    subcategoryId: subcategoryId || null,
                  })
              );
              if (!parentId && items.every((ef) => ef.parentId)) {
                return null;
              }

              return (
                <div key={tab.id}>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">{tab.label}</h4>
                  {!parentId ? (
                    <p className="text-xs text-gray-400">
                      Shared options appear after you pick a parent; tagged options need a parent
                      first.
                    </p>
                  ) : items.length === 0 ? (
                    <p className="text-xs text-gray-400">No options for this category yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => {
                        const selected = advancedIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleAdvanced(item.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              selected
                                ? "bg-gray-100 border-gray-300 text-gray-900"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {parentId ? (
              (() => {
                const items = featureFilters.filter(
                  (ff) =>
                    ff.parentId === parentId &&
                    (!ff.subcategoryId ||
                      !subcategoryId ||
                      ff.subcategoryId === subcategoryId)
                );
                const parentName = parents.find((p) => p.id === parentId)?.name ?? "Category";

                return (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Features · {parentName}
                    </h4>
                    {items.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        No features configured for this category yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => {
                          const selected = advancedIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleAdvanced(item.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                selected
                                  ? "bg-violet-700 border-violet-700 text-white"
                                  : "bg-white border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-700"
                              }`}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              featureFilters.length > 0 && (
                <p className="text-xs text-gray-400">
                  Select a parent category to choose feature filters.
                </p>
              )
            )}
          </div>
        )}
      </div>
      )}

    </>
  );

  if (renderLayout) {
    return renderLayout({ categoryLocation: categoryLocationSection, extras: extrasSection });
  }

  return (
    <div className="space-y-5 pt-1 border-t border-gray-100">
      {categoryLocationSection}
      {extrasSection}
    </div>
  );
}

/** Room type, bedrooms, beds, baths, and guests — admin Filter tabs for whole-property stays. */
export function ListingPropertyFilterFields({
  values = EMPTY_LISTING_FILTERS,
  onChange,
}: {
  values?: ListingFilterValues;
  onChange: (values: ListingFilterValues) => void;
}) {
  const { data } = useAdminTaxonomy();
  const safeValues = values ?? EMPTY_LISTING_FILTERS;
  const { customSelections } = safeValues;

  const propertyTabs = useMemo(() => {
    return PROPERTY_TAB_CANONICAL_ORDER.map((canonicalId) => {
      const tab = findPropertyTab(data, canonicalId);
      return tab ? { canonicalId, tab } : null;
    }).filter((row): row is { canonicalId: (typeof PROPERTY_TAB_CANONICAL_ORDER)[number]; tab: FilterTab } =>
      Boolean(row)
    );
  }, [data]);

  function patchCustomSelections(next: Record<string, string>) {
    onChange({ ...safeValues, customSelections: next });
  }

  if (propertyTabs.length === 0) return null;

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
      <div>
        <p className="text-sm font-semibold text-gray-900">Property details</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Same options as Admin → Settings → Filter (Room Types, Bedrooms, Beds, Baths, Guests).
          Shown on search and your listing page.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {propertyTabs.map(({ tab }) => {
          const canonicalId = resolvePropertyTabId(tab) ?? tab.id;
          const fallbackItems =
            DEFAULT_CUSTOM_ITEMS[canonicalId as keyof typeof DEFAULT_CUSTOM_ITEMS] ?? [];
          const items = [...(data.customItems[tab.id] ?? fallbackItems)]
            .filter((item) => item.enabled !== false)
            .sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
            );

          return (
            <FilterSelect
              key={tab.id}
              label={tab.label}
              id={`listing-property-${tab.id}`}
              value={customSelections[tab.id] ?? ""}
              onChange={(value) =>
                patchCustomSelections({ ...customSelections, [tab.id]: value })
              }
              options={items.map((item) => ({ value: item.id, label: item.name }))}
              placeholder={items.length ? `Select ${tab.label.toLowerCase()}` : "No options yet"}
              disabled={items.length === 0}
              required
            />
          );
        })}
      </div>
    </div>
  );
}
