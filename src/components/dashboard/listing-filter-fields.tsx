"use client";

import { useEffect, useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { isExcludedFromListingForm, isFilterEnabled } from "@/lib/admin/taxonomy-types";
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
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  );
}

export function ListingFilterFields({
  values = EMPTY_LISTING_FILTERS,
  onChange,
}: {
  values?: ListingFilterValues;
  onChange: (values: ListingFilterValues) => void;
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

  const customMainTabs = useMemo(
    () =>
      data.mainTabs.filter(
        (tab) =>
          !tab.builtIn && tab.enabled !== false && !isExcludedFromListingForm(tab)
      ),
    [data.mainTabs]
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
          (ef) => ef.id === id && ef.enabled !== false && extraTabOn(ef.type)
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
    ? "Select a parent category first."
    : categories.length === 0
      ? "No categories for this parent yet — add them in Admin → Settings → Filter."
      : undefined;

  const subcategoryHint = !categoryId
    ? "Select a category first."
    : subcategories.length === 0
      ? "No sub categories for this category yet — add them in Admin → Settings → Filter."
      : undefined;

  return (
    <div className="space-y-5 pt-1 border-t border-gray-100">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Location &amp; category</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showCountry && (
            <FilterSelect
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
          {showParent && (
            <FilterSelect
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
              label={tabLabel(data.mainTabs, "category", "Category")}
              id="listing-category"
              value={categoryId}
              onChange={(v) => patch({ categoryId: v, subcategoryId: "" })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={
                !parentId
                  ? "Select parent category first"
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
          {customMainTabs.map((tab) => {
            const items = [...(data.customItems[tab.id] ?? [])]
              .filter((i) => i.enabled !== false)
              .filter(
                (i) =>
                  !i.subcategoryId ||
                  !subcategoryId ||
                  i.subcategoryId === subcategoryId
              )
              .sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
              );
            return (
              <FilterSelect
                key={tab.id}
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
          })}
        </div>

        <ListingFeatureIconsField
          selectedIds={featureIconIds}
          onChange={(ids) => patch({ featureIconIds: ids })}
        />

        <ListingHighlightsField
          selectedIds={highlightIds}
          onChange={(ids) => patch({ highlightIds: ids })}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-900">Advanced filters</h4>
        </div>

        {extraTabs.length === 0 && featureFilters.length === 0 ? (
          <p className="text-sm text-gray-400">No advanced filters configured.</p>
        ) : (
          <div className="space-y-4">
            {extraTabs.map((tab) => {
              const items = extraFilters.filter((ef) => ef.type === tab.id);

              return (
                <div key={tab.id}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {tab.label}
                  </p>
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400">No options configured yet.</p>
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
                                ? "bg-green-700 border-green-700 text-white"
                                : "bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700"
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
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Features · {parentName}
                    </p>
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

      <p className="text-xs text-gray-400">
        Parent, Category, and Sub Category options sync from Admin → Settings → Filter.
        Changing parent resets category; changing category resets the sub category.
      </p>
    </div>
  );
}
