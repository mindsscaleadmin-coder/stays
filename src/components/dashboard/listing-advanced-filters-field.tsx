"use client";

import { useMemo } from "react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  extraFilterMatchesScope,
  getExtraFiltersForListingTab,
} from "@/lib/admin/extra-filter-scope";
import {
  inferExtraTabListingSection,
  isFilterEnabled,
  type FilterTab,
  type TaxonomyData,
} from "@/lib/admin/taxonomy-types";
import type { ListingFilterValues } from "@/lib/listings/submission-types";
import { cn } from "@/lib/utils";

type FilterRow = {
  key: string;
  label: string;
  items: { id: string; name: string }[];
};

function tabMatchesListingPlacement(
  tab: FilterTab,
  placement: "all" | "venueSpaceColumn" | "venueOptionsRemainder"
) {
  const section = inferExtraTabListingSection(tab);
  if (placement === "venueSpaceColumn") return section === "venueDetails";
  if (placement === "venueOptionsRemainder") return section === "venueOptions";
  return true;
}

export function advancedIdListingSection(
  taxonomy: TaxonomyData,
  filterId: string
): "venueDetails" | "venueOptions" | null {
  const extra = taxonomy.extraFilters.find((item) => item.id === filterId);
  if (extra) {
    const tab = taxonomy.extraTabs.find((item) => item.id === extra.type);
    if (tab) return inferExtraTabListingSection(tab);
    return inferExtraTabListingSection({ id: extra.type, label: extra.type });
  }
  if (taxonomy.featureFilters.some((item) => item.id === filterId)) {
    return "venueOptions";
  }
  return null;
}

export function splitAdvancedIdsByVenueSection(taxonomy: TaxonomyData, ids: string[]) {
  const venueDetails: string[] = [];
  const venueOptions: string[] = [];
  for (const id of ids) {
    const section = advancedIdListingSection(taxonomy, id);
    if (section === "venueDetails") venueDetails.push(id);
    else venueOptions.push(id);
  }
  return { venueDetails, venueOptions };
}

export function useListingAdvancedFilterRows(
  values: ListingFilterValues,
  placement: "all" | "venueSpaceColumn" | "venueOptionsRemainder" = "all"
) {
  const { data } = useAdminTaxonomy();
  const { parentId, categoryId, subcategoryId } = values;

  const scope = useMemo(
    () => ({
      parentId: parentId || null,
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
    }),
    [parentId, categoryId, subcategoryId]
  );

  return useMemo(() => {
    if (!categoryId) return [];

    const next: FilterRow[] = [];
    const seenLabels = new Set<string>();

    for (const tab of data.extraTabs.filter((item) => isFilterEnabled(item))) {
      if (!tabMatchesListingPlacement(tab, placement)) continue;

      const items = getExtraFiltersForListingTab(tab.id, data.extraFilters, scope).map((item) => ({
        id: item.id,
        name: item.name,
      }));
      if (items.length === 0) continue;

      const labelKey = tab.label.trim().toLowerCase();
      if (seenLabels.has(labelKey)) continue;
      seenLabels.add(labelKey);

      next.push({ key: tab.id, label: tab.label, items });
    }

    const features = data.featureFilters
      .filter(
        (item) =>
          isFilterEnabled(item) &&
          item.parentId === parentId &&
          (!item.subcategoryId || !subcategoryId || item.subcategoryId === subcategoryId)
      )
      .map((item) => ({ id: item.id, name: item.name }));

    if (
      features.length > 0 &&
      tabMatchesListingPlacement(
        { id: "features", label: "Features", listingSection: "venueOptions" },
        placement
      ) &&
      !seenLabels.has("features")
    ) {
      next.push({ key: "features", label: "Features", items: features });
    }

    return next;
  }, [
    data.extraTabs,
    data.extraFilters,
    data.featureFilters,
    parentId,
    subcategoryId,
    scope,
    categoryId,
    placement,
  ]);
}

export function ListingAdvancedFiltersField({
  values,
  onChange,
  placement = "all",
  embedded = false,
}: {
  values: ListingFilterValues;
  onChange: (next: ListingFilterValues) => void;
  /** Split venue listing filters between the spaces card and the options block below. */
  placement?: "all" | "venueSpaceColumn" | "venueOptionsRemainder";
  /** Render without the outer panel chrome when nested inside another card. */
  embedded?: boolean;
}) {
  const { advancedIds } = values;
  const visibleRows = useListingAdvancedFilterRows(values, placement);

  function toggleAdvanced(id: string) {
    onChange({
      ...values,
      advancedIds: advancedIds.includes(id)
        ? advancedIds.filter((item) => item !== id)
        : [...advancedIds, id],
    });
  }

  if (!values.categoryId || visibleRows.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        !embedded && "border border-gray-100 rounded-xl p-4 bg-gray-50/60",
        embedded && "space-y-0"
      )}
    >
      {visibleRows.map((row, index) => (
        <div
          key={row.key}
          className={cn(
            index > 0 && "pt-3",
            index < visibleRows.length - 1 && "border-b border-gray-100 pb-3"
          )}
        >
          <p className="text-xs font-medium text-gray-600 mb-1.5">{row.label}</p>
          <div className="flex flex-wrap gap-2">
            {row.items.map((item) => {
              const selected = advancedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleAdvanced(item.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    selected
                      ? "bg-gray-100 border-gray-300 text-gray-900"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
