import type { ExtraFilter } from "@/lib/admin/taxonomy-types";
import { DEFAULT_EXTRA_TABS, isFilterEnabled } from "@/lib/admin/taxonomy-types";

export interface ExtraFilterScope {
  parentId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
}

/** Extra filters with empty scope fields apply at every level; set fields narrow visibility. */
export function extraFilterMatchesScope(
  filter: Pick<ExtraFilter, "parentId" | "categoryId" | "subcategoryId">,
  scope: ExtraFilterScope
): boolean {
  if (filter.parentId) {
    if (!scope.parentId || filter.parentId !== scope.parentId) return false;
  }
  if (filter.categoryId) {
    if (!scope.categoryId || filter.categoryId !== scope.categoryId) return false;
  }
  if (filter.subcategoryId) {
    if (!scope.subcategoryId || filter.subcategoryId !== scope.subcategoryId) return false;
  }
  return true;
}

/** Listing forms: generic amenity/tag tabs only show options scoped to the selected parent. */
export function getExtraFiltersForListingTab(
  tabId: string,
  extraFilters: ExtraFilter[],
  scope: ExtraFilterScope
): ExtraFilter[] {
  const matching = extraFilters.filter(
    (item) =>
      isFilterEnabled(item) &&
      item.type === tabId &&
      extraFilterMatchesScope(item, scope)
  );

  if (!scope.parentId) return matching;

  const isBuiltInGenericTab = DEFAULT_EXTRA_TABS.some((tab) => tab.id === tabId);
  if (!isBuiltInGenericTab) return matching;

  return matching.filter((item) => item.parentId === scope.parentId);
}

/** @deprecated Prefer extraFilterMatchesScope with full listing scope. */
export function extraFilterMatchesParent(
  filter: Pick<ExtraFilter, "parentId" | "categoryId" | "subcategoryId">,
  parentId: string | undefined | null,
  categoryId?: string | null,
  subcategoryId?: string | null
): boolean {
  return extraFilterMatchesScope(filter, { parentId, categoryId, subcategoryId });
}
