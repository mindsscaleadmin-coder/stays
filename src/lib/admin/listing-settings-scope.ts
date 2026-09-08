/** Shared taxonomy scope for listing feature icons / highlights. */
export type ListingTaxonomyScope = {
  parentId?: string;
  categoryId?: string;
  subcategoryId?: string;
};

/**
 * Unset fields mean “broader” (all). A scoped item matches when every set
 * level equals the listing’s corresponding taxonomy id.
 */
export function listingSettingMatchesTaxonomy(
  item: ListingTaxonomyScope,
  listing: ListingTaxonomyScope
): boolean {
  if (item.parentId) {
    if (!listing.parentId || item.parentId !== listing.parentId) return false;
  }
  if (item.categoryId) {
    if (!listing.categoryId || item.categoryId !== listing.categoryId) return false;
  }
  if (item.subcategoryId) {
    if (!listing.subcategoryId || item.subcategoryId !== listing.subcategoryId) {
      return false;
    }
  }
  return true;
}

function scopeSpecificity(item: ListingTaxonomyScope): number {
  if (item.subcategoryId) return 3;
  if (item.categoryId) return 2;
  if (item.parentId) return 1;
  return 0;
}

/**
 * Resolve options at the most specific configured level for the current
 * selection. Subcategory options replace category options, category options
 * replace parent options, and parent options replace global fallbacks.
 */
export function resolveListingSettingsForTaxonomy<T extends ListingTaxonomyScope>(
  items: T[],
  listing: ListingTaxonomyScope
): T[] {
  const matches = items.filter((item) =>
    listingSettingMatchesTaxonomy(item, listing)
  );
  if (matches.length === 0) return [];
  const mostSpecific = Math.max(...matches.map(scopeSpecificity));
  return matches.filter((item) => scopeSpecificity(item) === mostSpecific);
}

export function normalizeListingTaxonomyScope(
  scope: ListingTaxonomyScope
): ListingTaxonomyScope {
  const parentId = scope.parentId?.trim() || undefined;
  const categoryId = parentId ? scope.categoryId?.trim() || undefined : undefined;
  const subcategoryId = categoryId
    ? scope.subcategoryId?.trim() || undefined
    : undefined;
  return { parentId, categoryId, subcategoryId };
}
