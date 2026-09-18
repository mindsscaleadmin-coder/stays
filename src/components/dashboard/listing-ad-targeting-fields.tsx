"use client";

import { useMemo } from "react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { describeListingAdTargeting, isGlobalListingAd } from "@/lib/admin/listing-ad-targeting";
import type { ListingAdTargeting, ListingSidebarAd } from "@/lib/admin/listing-ads-types";

const fieldClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function findNameById<T extends { id: string; name: string }>(
  items: T[],
  id: string
): string {
  return items.find((item) => item.id === id)?.name ?? "";
}

function findIdByName<T extends { id: string; name: string }>(
  items: T[],
  name?: string
): string {
  if (!name?.trim()) return "";
  const match = items.find((item) => item.name.trim() === name.trim());
  return match?.id ?? "";
}

export function ListingAdTargetingFields({
  ad,
  onChange,
}: {
  ad: ListingSidebarAd;
  onChange: (targeting: ListingAdTargeting) => void;
}) {
  const { data } = useAdminTaxonomy();
  const targeting = ad.targeting ?? {};

  const countries = useMemo(() => filterActiveCountries(data.countries), [data.countries]);

  const countryId = findIdByName(countries, targeting.country);
  const stateId = findIdByName(
    data.states.filter((s) => s.enabled !== false && (!countryId || s.countryId === countryId)),
    targeting.state
  );
  const districtId = findIdByName(
    data.districts.filter((d) => d.enabled !== false && (!stateId || d.stateId === stateId)),
    targeting.district
  );
  const parentId = findIdByName(
    data.parents.filter((p) => p.enabled !== false),
    targeting.parent
  );
  const categoryId = findIdByName(
    data.categories.filter(
      (c) => c.enabled !== false && (!parentId || c.parentId === parentId)
    ),
    targeting.category
  );

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

  const subcategories = useMemo(
    () =>
      categoryId
        ? data.subcategories.filter(
            (sc) => sc.enabled !== false && sc.categoryId === categoryId
          )
        : [],
    [data.subcategories, categoryId]
  );

  function patchTargeting(patch: Partial<ListingAdTargeting>) {
    onChange({ ...targeting, ...patch });
  }

  function setCountry(nextCountryId: string) {
    const next: ListingAdTargeting = { ...targeting, country: findNameById(countries, nextCountryId) };
    if (!nextCountryId) {
      next.country = undefined;
      next.state = undefined;
      next.district = undefined;
    } else if (next.state) {
      const stateStillValid = data.states.some(
        (s) => s.name === next.state && s.countryId === nextCountryId
      );
      if (!stateStillValid) {
        next.state = undefined;
        next.district = undefined;
      }
    }
    onChange(next);
  }

  function setState(nextStateId: string) {
    const next: ListingAdTargeting = {
      ...targeting,
      state: findNameById(states, nextStateId),
    };
    if (!nextStateId) {
      next.state = undefined;
      next.district = undefined;
    } else if (next.district) {
      const districtStillValid = data.districts.some(
        (d) => d.name === next.district && d.stateId === nextStateId
      );
      if (!districtStillValid) next.district = undefined;
    }
    onChange(next);
  }

  function setDistrict(nextDistrictId: string) {
    patchTargeting({
      district: nextDistrictId ? findNameById(districts, nextDistrictId) : undefined,
    });
  }

  function setParent(nextParentId: string) {
    const next: ListingAdTargeting = {
      ...targeting,
      parent: findNameById(parents, nextParentId),
    };
    if (!nextParentId) {
      next.parent = undefined;
      next.category = undefined;
      next.subcategory = undefined;
    } else if (next.category) {
      const categoryStillValid = data.categories.some(
        (c) => c.name === next.category && c.parentId === nextParentId
      );
      if (!categoryStillValid) {
        next.category = undefined;
        next.subcategory = undefined;
      }
    }
    onChange(next);
  }

  function setCategory(nextCategoryId: string) {
    const next: ListingAdTargeting = {
      ...targeting,
      category: findNameById(categories, nextCategoryId),
    };
    if (!nextCategoryId) {
      next.category = undefined;
      next.subcategory = undefined;
    } else if (next.subcategory) {
      const subStillValid = data.subcategories.some(
        (sc) => sc.name === next.subcategory && sc.categoryId === nextCategoryId
      );
      if (!subStillValid) next.subcategory = undefined;
    }
    onChange(next);
  }

  function setSubcategory(nextSubcategoryId: string) {
    patchTargeting({
      subcategory: nextSubcategoryId
        ? findNameById(subcategories, nextSubcategoryId)
        : undefined,
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Show when
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            Match search filters on the listings page. Leave fields on &quot;Any&quot; for a
            site-wide fallback.
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isGlobalListingAd(ad)
              ? "bg-gray-100 text-gray-600"
              : "bg-green-50 text-green-800"
          }`}
        >
          {describeListingAdTargeting(ad)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Country</span>
          <select
            value={countryId}
            onChange={(e) => setCountry(e.target.value)}
            className={fieldClass}
          >
            <option value="">Any country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">State</span>
          <select
            value={stateId}
            onChange={(e) => setState(e.target.value)}
            disabled={!countryId}
            className={fieldClass}
          >
            <option value="">Any state</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">District</span>
          <select
            value={districtId}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={!stateId}
            className={fieldClass}
          >
            <option value="">Any district</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Parent</span>
          <select
            value={parentId}
            onChange={(e) => setParent(e.target.value)}
            className={fieldClass}
          >
            <option value="">Any parent</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!parentId}
            className={fieldClass}
          >
            <option value="">Any category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Subcategory</span>
          <select
            value={findIdByName(subcategories, targeting.subcategory)}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={!categoryId}
            className={fieldClass}
          >
            <option value="">Any subcategory</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
