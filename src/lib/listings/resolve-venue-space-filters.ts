import { inferExtraTabListingSection } from "@/lib/admin/taxonomy-types";
import type { TaxonomyData } from "@/lib/admin/taxonomy-types";

export type VenueSpaceFilterGroup = {
  label: string;
  names: string[];
};

/** Resolve selected venue-space filter ids into grouped labels for guest display. */
export function resolveVenueSpaceFilterGroups(
  taxonomy: TaxonomyData,
  filterIds: string[]
): VenueSpaceFilterGroup[] {
  if (filterIds.length === 0) return [];

  const groups = new Map<string, string[]>();

  for (const id of filterIds) {
    const extra = taxonomy.extraFilters.find((item) => item.id === id);
    if (!extra) continue;

    const tab = taxonomy.extraTabs.find((item) => item.id === extra.type);
    const section = tab
      ? inferExtraTabListingSection(tab)
      : inferExtraTabListingSection({ id: extra.type, label: extra.type });
    if (section !== "venueDetails") continue;

    const label = tab?.label ?? extra.type;
    const names = groups.get(label) ?? [];
    names.push(extra.name);
    groups.set(label, names);
  }

  return Array.from(groups.entries()).map(([label, names]) => ({ label, names }));
}

function filterNamesToIds(taxonomy: TaxonomyData, names: string[]) {
  const ids: string[] = [];
  for (const name of names) {
    const match = taxonomy.extraFilters.find((item) => item.name === name);
    if (match) ids.push(match.id);
  }
  return ids;
}

function splitVenueDetailIds(taxonomy: TaxonomyData, ids: string[]) {
  const venueDetails: string[] = [];
  for (const id of ids) {
    const extra = taxonomy.extraFilters.find((item) => item.id === id);
    if (!extra) continue;
    const tab = taxonomy.extraTabs.find((item) => item.id === extra.type);
    const section = tab
      ? inferExtraTabListingSection(tab)
      : inferExtraTabListingSection({ id: extra.type, label: extra.type });
    if (section === "venueDetails") venueDetails.push(id);
  }
  return venueDetails;
}

export function resolveVenueSpaceFilterIdsForRoom(
  taxonomy: TaxonomyData,
  room: { advancedFilterIds?: string[] },
  allRooms: { advancedFilterIds?: string[] }[],
  listingAdvancedNames: string[]
): string[] {
  if (room.advancedFilterIds?.length) return room.advancedFilterIds;

  const anyRoomHasIds = allRooms.some((item) => (item.advancedFilterIds?.length ?? 0) > 0);
  if (anyRoomHasIds) return [];

  return splitVenueDetailIds(taxonomy, filterNamesToIds(taxonomy, listingAdvancedNames));
}

export function buildEventSpaceFilterGroups(
  taxonomy: TaxonomyData,
  room: { advancedFilterIds?: string[] },
  allRooms: { advancedFilterIds?: string[] }[],
  listingAdvancedNames: string[],
  multiRate: boolean
): VenueSpaceFilterGroup[] {
  if (!multiRate) return [];
  const filterIds = resolveVenueSpaceFilterIdsForRoom(
    taxonomy,
    room,
    allRooms,
    listingAdvancedNames
  );
  return resolveVenueSpaceFilterGroups(taxonomy, filterIds);
}
