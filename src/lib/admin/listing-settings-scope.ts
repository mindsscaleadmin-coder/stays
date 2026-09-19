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

export function listingTaxonomyTier(scope: ListingTaxonomyScope): number {
  const normalized = normalizeListingTaxonomyScope(scope);
  if (normalized.subcategoryId) return 3;
  if (normalized.categoryId) return 2;
  if (normalized.parentId) return 1;
  return 0;
}

export function hasListingTaxonomySelection(scope: ListingTaxonomyScope): boolean {
  const normalized = normalizeListingTaxonomyScope(scope);
  return Boolean(normalized.parentId || normalized.categoryId);
}

/**
 * Resolve options at the most specific configured level for the current
 * selection. Walk from the listing's taxonomy tier down to global fallbacks.
 */
export function resolveListingSettingsForTaxonomy<T extends ListingTaxonomyScope>(
  items: T[],
  listing: ListingTaxonomyScope
): T[] {
  const normalized = normalizeListingTaxonomyScope(listing);
  const listingTier = listingTaxonomyTier(normalized);

  for (let tier = listingTier; tier >= 0; tier -= 1) {
    const tierItems = items.filter(
      (item) =>
        listingSettingMatchesTaxonomy(item, normalized) && scopeSpecificity(item) === tier
    );
    if (tierItems.length > 0) return tierItems;
  }

  return [];
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
