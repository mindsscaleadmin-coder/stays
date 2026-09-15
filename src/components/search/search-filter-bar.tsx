"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useCountry } from "@/components/providers/country-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { tabEnabled, tabLabel } from "@/lib/admin/taxonomy-nav";
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
  initialDistrict = "",
  initialCity = "",
  initialParent = "",
  initialCategory = "",
  initialSubcategory = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = 0,
  initialAdults = 0,
  initialChildren = 0,
  initialInfants = 0,
  initialAdvanced = "",
  initialSort = "recommended",
  activeAdvancedCount = 0,
  resultsPath = "/listings",
}: {
  variant?: "top" | "hero";
  initialCountry?: string;
  initialState?: string;
  initialDistrict?: string;
  initialCity?: string;
  initialParent?: string;
  initialCategory?: string;
  initialSubcategory?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  initialAdults?: number;
  initialChildren?: number;
  initialInfants?: number;
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
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [parentId, setParentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draftAdvancedIds, setDraftAdvancedIds] = useState<string[]>([]);

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
    if (initialDistrict) {
      setDistrictId(data.districts.find((s) => s.name === initialDistrict)?.id ?? "");
    }
    if (initialCity) {
      setCityId((data.cities ?? []).find((c) => c.name === initialCity)?.id ?? "");
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
    initialDistrict,
    initialCity,
    initialParent,
    initialCategory,
    initialSubcategory,
    data.countries,
    data.states,
    data.districts,
    data.cities,
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

  const districts = useMemo(
    () =>
      data.districts.filter(
        (d) =>
          d.enabled !== false && (!stateId || d.stateId === stateId)
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

  const isHero = variant === "hero";
  const showState = tabEnabled(data, "state");
  const showDistrict = !isHero && tabEnabled(data, "district");
  const showCity = !isHero && tabEnabled(data, "city");
  const showParent = tabEnabled(data, "parent");
  const showCategory = !isHero && tabEnabled(data, "category");
  const showSubcategory = !isHero && tabEnabled(data, "subcategory");

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
    const params = new URLSearchParams();

    const country = data.countries.find((c) => c.id === selectedCountryId)?.name;
    const state = data.states.find((s) => s.id === stateId)?.name;
    const district = data.districts.find((d) => d.id === districtId)?.name;
    const city = (data.cities ?? []).find((c) => c.id === cityId)?.name;
    const parent = data.parents.find((p) => p.id === selectedParentId)?.name;
    const category = (data.categories ?? []).find((c) => c.id === selectedCategoryId)?.name;
    const subcategory = data.subcategories.find((sc) => sc.id === selectedSubcategoryId)?.name;

    if (country) params.set("country", country);
    if (state) params.set("state", state);
    if (district) params.set("district", district);
    if (city) params.set("city", city);
    if (parent) params.set("parent", parent);
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (initialGuests > 0) params.set("guests", String(initialGuests));
    if (initialAdults > 0) params.set("adults", String(initialAdults));
    if (initialChildren > 0) params.set("children", String(initialChildren));
    if (initialInfants > 0) params.set("infants", String(initialInfants));
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

  const compactFields = true;
  const fieldClass = "min-w-0 flex-1";
  const labelClass = "block font-medium text-gray-500 mb-1 text-[10px] truncate";
  const inputClass = cn(selectClass, "py-2 px-2 text-xs");

  return (
    <>
      <div
        className={cn(
          isHero
            ? "w-full bg-white rounded-2xl shadow-2xl p-5"
            : "bg-white border-b shadow-sm sticky top-[3.75rem] sm:top-[4.25rem] z-30 overflow-visible"
        )}
      >
        <div className={cn(!isHero && "max-w-7xl mx-auto px-4 py-2.5")}>
          {isHero && (
            <p className="text-sm font-semibold text-gray-700 mb-3">{t("label")}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row lg:items-end gap-2">
            {showState && (
            <div className={fieldClass}>
              <label htmlFor="search-state" className={labelClass}>
                {tabLabel(data, "state", t("state"))}
              </label>
              <select
                id="search-state"
                value={stateId}
                onChange={(e) => {
                  setStateId(e.target.value);
                  setDistrictId("");
                  setCityId("");
                }}
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
            )}

            {showDistrict && (
            <div className={fieldClass}>
              <label htmlFor="search-district" className={labelClass}>
                {tabLabel(data, "district", "District")}
              </label>
              <select
                id="search-district"
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setCityId("");
                }}
                className={inputClass}
                disabled={!stateId && states.length > 0}
              >
                <option value="">ALL</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            )}

            {showCity && (
            <div className={fieldClass}>
              <label htmlFor="search-city" className={labelClass}>
                {tabLabel(data, "city", "City")}
              </label>
              <select
                id="search-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className={inputClass}
                disabled={!districtId || cities.length === 0}
              >
                <option value="">ALL</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            )}

            {showParent && (
            <div className={fieldClass}>
              <label htmlFor="search-parent" className={labelClass}>
                {tabLabel(data, "parent", t("parentCategory"))}
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
            )}

            {showCategory && (
              <div className={fieldClass}>
                <label htmlFor="search-category" className={labelClass}>
                  {tabLabel(data, "category", t("category"))}
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
                  {tabLabel(data, "subcategory", t("subcategory"))}
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

            <div className={cn(fieldClass, "sm:col-span-2 lg:col-auto lg:max-w-[11rem]")}>
              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                minDate={minDate}
                onCheckInChange={setCheckIn}
                onCheckOutChange={setCheckOut}
                compact={compactFields}
              />
            </div>

            <div className="flex items-end shrink-0 sm:col-span-2 lg:col-auto">
              <button
                type="button"
                onClick={handleSearch}
                aria-label={t("button")}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-lg text-xs bg-green-700 hover:bg-green-800 text-white font-semibold transition-colors shrink-0 w-full lg:w-auto min-h-[40px]"
              >
                <Search className="w-3.5 h-3.5" />
                {isHero ? t("buttonShort") : t("button")}
              </button>
            </div>
          </div>

          {!isHero && (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-end gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
            <div className="relative min-w-0 w-full sm:w-[9.5rem]">
              <button
                type="button"
                onClick={toggleAdvancedFilters}
                aria-expanded={popoverOpen}
                className={cn(
                  inputClass,
                  "inline-flex items-center justify-center gap-1.5 font-semibold",
                  popoverOpen
                    ? "border-gray-900 bg-gray-50 text-gray-900"
                    : "hover:border-gray-400"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("advancedFilters")}</span>
                {filterCount > 0 && (
                  <span className="bg-gray-900 text-white text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[1.1rem] text-center shrink-0">
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
                  categoryId={selectedCategoryId}
                  subcategoryId={selectedSubcategoryId}
                  selectedIds={draftAdvancedIds}
                  onChange={setDraftAdvancedIds}
                  onApply={applyAdvancedFilters}
                  onClear={clearAdvancedFilters}
                  compact
                  className="max-h-[min(70vh,480px)]"
                />
              </AdvancedFilterPopover>
            </div>

            <div className="relative min-w-0 w-full sm:w-[9.5rem]">
              <button
                id="search-sort"
                type="button"
                aria-label={t("sort")}
                aria-expanded={sortOpen}
                onClick={() => setSortOpen((open) => !open)}
                className={cn(inputClass, "flex items-center justify-between gap-1 text-start")}
              >
                <span className="truncate font-bold">{t("sort")}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform",
                    sortOpen && "rotate-180"
                  )}
                />
              </button>
              {sortOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Close sort"
                    onClick={() => setSortOpen(false)}
                  />
                  <div className="absolute end-0 top-full mt-1 z-50 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden py-1">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSort(option);
                          setSortOpen(false);
                        }}
                        className={cn(
                          "w-full text-start px-3 py-2 text-xs transition-colors",
                          option === sort
                            ? "bg-green-50 text-green-800 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {t(`sortOptions.${option}`)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
