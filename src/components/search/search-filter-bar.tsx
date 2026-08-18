"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useCountry } from "@/components/providers/country-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { isFilterEnabled } from "@/lib/admin/taxonomy-types";
import type { SortOption } from "@/lib/listings/public-listings";
import { AdvancedFilterPopover } from "@/components/search/advanced-filter-popover";
import { AdvancedFilterPanel } from "@/components/search/advanced-filter-panel";
import { DateRangePicker } from "@/components/search/date-range-picker";
import { cn } from "@/lib/utils";

const selectClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400";

function resolveCountryId(
  countries: { id: string; name: string; code?: string }[],
  opts: { name?: string; headerCode?: string; headerName?: string }
): string {
  const name = opts.name?.trim().toLowerCase();
  if (name) {
    const byName = countries.find((c) => c.name.toLowerCase() === name);
    if (byName) return byName.id;
  }
  const code = (opts.headerCode ?? "").toUpperCase();
  if (code) {
    const byCode = countries.find((c) => (c.code ?? "").toUpperCase() === code);
    if (byCode) return byCode.id;
  }
  const headerName = opts.headerName?.trim().toLowerCase();
  if (headerName) {
    const byHeaderName = countries.find((c) => c.name.toLowerCase() === headerName);
    if (byHeaderName) return byHeaderName.id;
  }
  return "";
}

const SORT_OPTIONS: SortOption[] = [
  "recommended",
  "price_asc",
  "price_desc",
  "rating_desc",
  "newest",
];

export function SearchFilterBar({
  variant = "top",
  initialCountry = "",
  initialState = "",
  initialParent = "",
  initialCategory = "",
  initialSubcategory = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialAdvanced = "",
  initialSort = "recommended",
  activeAdvancedCount = 0,
  resultsPath = "/listings",
}: {
  variant?: "top" | "hero";
  initialCountry?: string;
  initialState?: string;
  initialParent?: string;
  initialCategory?: string;
  initialSubcategory?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdvanced?: string;
  initialSort?: SortOption;
  activeAdvancedCount?: number;
  resultsPath?: string;
}) {
  const t = useTranslations("home.search");
  const router = useRouter();
  const { data } = useAdminTaxonomy();
  const { country: headerCountry, setCountry: setHeaderCountry } = useCountry();

  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [parentId, setParentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftAdvancedIds, setDraftAdvancedIds] = useState<string[]>([]);
  const [countryError, setCountryError] = useState(false);

  const appliedAdvancedIds = useMemo(
    () => (initialAdvanced ? initialAdvanced.split(",").filter(Boolean) : []),
    [initialAdvanced]
  );

  useEffect(() => {
    setCheckIn(initialCheckIn);
    setCheckOut(initialCheckOut);
    setSort(initialSort);
    setDraftAdvancedIds(appliedAdvancedIds);
  }, [initialCheckIn, initialCheckOut, initialSort, appliedAdvancedIds]);

  useEffect(() => {
    const resolved = resolveCountryId(data.countries, {
      name: initialCountry,
      headerCode: headerCountry.code,
      headerName: headerCountry.name,
    });
    if (resolved) setCountryId(resolved);
    else if (initialCountry) setCountryId("");

    if (initialState) {
      setStateId(data.states.find((s) => s.name === initialState)?.id ?? "");
    }
    if (initialParent) {
      setParentId(data.parents.find((p) => p.name === initialParent)?.id ?? "");
    }
    if (initialCategory) {
      setCategoryId(
        (data.categories ?? []).find((c) => c.name === initialCategory)?.id ?? ""
      );
    }
    if (initialSubcategory) {
      setSubcategoryId(
        data.subcategories.find((sc) => sc.name === initialSubcategory)?.id ?? ""
      );
    }
  }, [
    initialCountry,
    initialState,
    initialParent,
    initialCategory,
    initialSubcategory,
    data.countries,
    data.states,
    data.parents,
    data.categories,
    data.subcategories,
    headerCountry.code,
    headerCountry.name,
  ]);

  const countries = useMemo(() => filterActiveCountries(data.countries), [data.countries]);

  const resolvedCountryId = resolveCountryId(countries, {
    name: initialCountry,
    headerCode: headerCountry.code,
    headerName: headerCountry.name,
  });
  const selectedCountryId = countryId || resolvedCountryId;

  const resolvedParentId = initialParent
    ? data.parents.find(
        (p) => p.name.toLowerCase() === initialParent.trim().toLowerCase()
      )?.id ?? ""
    : "";
  const selectedParentId = parentId || resolvedParentId;

  const resolvedCategoryId = initialCategory
    ? (data.categories ?? []).find(
        (c) => c.name.toLowerCase() === initialCategory.trim().toLowerCase()
      )?.id ?? ""
    : "";
  const selectedCategoryId = categoryId || resolvedCategoryId;

  const resolvedSubcategoryId = initialSubcategory
    ? data.subcategories.find(
        (sc) => sc.name.toLowerCase() === initialSubcategory.trim().toLowerCase()
      )?.id ?? ""
    : "";
  const selectedSubcategoryId = subcategoryId || resolvedSubcategoryId;

  const states = useMemo(
    () =>
      data.states.filter(
        (s) =>
          s.enabled !== false && (!selectedCountryId || s.countryId === selectedCountryId)
      ),
    [data.states, selectedCountryId]
  );

  const parents = useMemo(
    () => data.parents.filter((p) => p.enabled !== false),
    [data.parents]
  );

  const showCategory = isFilterEnabled(data.mainTabs.find((t) => t.id === "category"));
  const showSubcategory = isFilterEnabled(data.mainTabs.find((t) => t.id === "subcategory"));

  const categories = useMemo(
    () =>
      (data.categories ?? []).filter(
        (c) =>
          c.enabled !== false && (!selectedParentId || c.parentId === selectedParentId)
      ),
    [data.categories, selectedParentId]
  );

  const subcategories = useMemo(
    () =>
      data.subcategories.filter(
        (sc) =>
          sc.enabled !== false &&
          (!selectedCategoryId || sc.categoryId === selectedCategoryId)
      ),
    [data.subcategories, selectedCategoryId]
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

  // Fixed calendar floor for SSR/client parity (UTC date can drift near midnight).
  const [minDate] = useState(() => new Date().toISOString().split("T")[0]);
  const filterCount = activeAdvancedCount || appliedAdvancedIds.length;

  function pushSearch(advancedIds: string[]) {
    if (!selectedCountryId) {
      setCountryError(true);
      return;
    }
    setCountryError(false);

    const params = new URLSearchParams();

    const country = data.countries.find((c) => c.id === selectedCountryId)?.name;
    const state = data.states.find((s) => s.id === stateId)?.name;
    const parent = data.parents.find((p) => p.id === selectedParentId)?.name;
    const category = (data.categories ?? []).find((c) => c.id === selectedCategoryId)?.name;
    const subcategory = data.subcategories.find((sc) => sc.id === selectedSubcategoryId)?.name;

    if (!country) {
      setCountryError(true);
      return;
    }

    params.set("country", country);
    if (state) params.set("state", state);
    if (parent) params.set("parent", parent);
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (sort && sort !== "recommended") params.set("sort", sort);
    if (advancedIds.length > 0) params.set("advanced", advancedIds.join(","));

    const selected = data.countries.find((c) => c.id === selectedCountryId);
    if (selected?.code) {
      setHeaderCountry(selected.code.toUpperCase());
    }

    const qs = params.toString();
    router.push(`${resultsPath}?${qs}`);
  }

  function handleSearch() {
    pushSearch(draftAdvancedIds);
  }

  function toggleAdvancedFilters() {
    setPopoverOpen((open) => !open);
  }

  function applyAdvancedFilters() {
    pushSearch(draftAdvancedIds);
    setPopoverOpen(false);
  }

  function clearAdvancedFilters() {
    setDraftAdvancedIds([]);
  }

  const isHero = variant === "hero";
  const fieldClass = cn(isHero && "flex-1 min-w-0");
  const labelClass = cn(
    "block font-medium text-gray-500 mb-1",
    isHero ? "text-[10px]" : "text-xs"
  );
  const inputClass = cn(selectClass, isHero && "py-2 px-2 text-xs");

  return (
    <>
      <div
        className={cn(
          isHero
            ? "w-full bg-white rounded-2xl shadow-2xl p-5"
            : "bg-white border-b shadow-sm sticky top-0 z-30 overflow-visible"
        )}
      >
        <div className={cn(!isHero && "max-w-7xl mx-auto px-4 py-4")}>
          {isHero && (
            <p className="text-sm font-semibold text-gray-700 mb-3">{t("label")}</p>
          )}

          <div
            className={cn(
              isHero
                ? "flex flex-col sm:flex-row sm:flex-wrap items-end gap-2"
                : "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
            )}
          >
            <div className={fieldClass}>
              <label htmlFor="search-country" className={labelClass}>
                {t("country")}
              </label>
              <select
                id="search-country"
                value={selectedCountryId}
                required
                aria-invalid={countryError}
                onChange={(e) => {
                  setCountryId(e.target.value);
                  setStateId("");
                  setCountryError(false);
                }}
                className={cn(
                  inputClass,
                  countryError && "border-red-400 ring-2 ring-red-200"
                )}
              >
                <option value="" disabled hidden>
                  {t("countryPlaceholder")}
                </option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {countryError && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  {t("countryRequired")}
                </p>
              )}
            </div>

            <div className={fieldClass}>
              <label htmlFor="search-state" className={labelClass}>
                {t("state")}
              </label>
              <select
                id="search-state"
                value={stateId}
                onChange={(e) => setStateId(e.target.value)}
                className={inputClass}
              >
                <option value="">ALL</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={fieldClass}>
              <label htmlFor="search-parent" className={labelClass}>
                {t("parentCategory")}
              </label>
              <select
                id="search-parent"
                value={selectedParentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                  setCategoryId("");
                  setSubcategoryId("");
                }}
                className={inputClass}
              >
                <option value="">ALL</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {showCategory && (
              <div className={fieldClass}>
                <label htmlFor="search-category" className={labelClass}>
                  {t("category")}
                </label>
                <select
                  id="search-category"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId("");
                  }}
                  className={inputClass}
                >
                  <option value="">{t("categoryPlaceholder")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showSubcategory && (
              <div className={fieldClass}>
                <label htmlFor="search-subcategory" className={labelClass}>
                  {t("subcategory")}
                </label>
                <select
                  id="search-subcategory"
                  value={selectedSubcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className={inputClass}
                  disabled={!selectedCategoryId && categories.length > 0}
                >
                  <option value="">{t("subcategoryPlaceholder")}</option>
                  {subcategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={fieldClass}>
              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                minDate={minDate}
                onCheckInChange={setCheckIn}
                onCheckOutChange={setCheckOut}
                compact={isHero}
              />
            </div>

            <div className={cn("flex items-end", isHero ? "shrink-0" : "")}>
              <button
                type="button"
                onClick={handleSearch}
                aria-label={t("button")}
                className={cn(
                  "flex items-center justify-center bg-green-700 hover:bg-green-800 text-white font-semibold transition-colors",
                  isHero
                    ? "gap-1.5 px-3 py-2 rounded-lg text-xs shrink-0"
                    : "gap-2 px-5 py-2.5 rounded-xl text-sm w-full"
                )}
              >
                <Search className={cn(isHero ? "w-3.5 h-3.5" : "w-4 h-4")} />
                {isHero ? t("buttonShort") : t("button")}
              </button>
            </div>
          </div>

          {!isHero && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={toggleAdvancedFilters}
                aria-expanded={popoverOpen}
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors w-full sm:w-auto",
                  popoverOpen
                    ? "border-gray-900 bg-gray-50 text-gray-900"
                    : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t("advancedFilters")}
                {filterCount > 0 && (
                  <span className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {filterCount}
                  </span>
                )}
              </button>

              <AdvancedFilterPopover open={popoverOpen} onClose={() => setPopoverOpen(false)}>
                <AdvancedFilterPanel
                  tabs={extraTabs}
                  extraFilters={extraFilters}
                  featureFilters={featureFilters}
                  parents={parents}
                  parentCategoryId={selectedParentId}
                  selectedIds={draftAdvancedIds}
                  onChange={setDraftAdvancedIds}
                  onApply={applyAdvancedFilters}
                  onClear={clearAdvancedFilters}
                  compact
                  className="max-h-[min(70vh,480px)]"
                />
              </AdvancedFilterPopover>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <select
                id="search-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className={cn(selectClass, "sm:min-w-[200px]")}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`sortOptions.${option}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
