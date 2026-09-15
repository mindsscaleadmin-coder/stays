import { inferExtraTabListingSection } from "@/lib/admin/taxonomy-types";
import type { TaxonomyData } from "@/lib/admin/taxonomy-types";

export type VenueAmenitySection = "venueDetails" | "venueOptions";

export type VenueAmenityGroup = {
  id: string;
  label: string;
  section: VenueAmenitySection;
  items: string[];
};

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function tabInfo(taxonomy: TaxonomyData, typeId: string) {
  const tab = taxonomy.extraTabs.find((item) => item.id === typeId);
  const section = tab
    ? inferExtraTabListingSection(tab)
    : inferExtraTabListingSection({ id: typeId, label: typeId });
  return {
    label: tab?.label ?? typeId,
    section,
  };
}

function inferGroupId(name: string): string {
  const lower = normalizeLabel(name);
  if (lower.includes("park")) return "venueParking";
  if (
    lower.includes("cater") ||
    lower.includes("kitchen") ||
    lower.includes("food") ||
    lower.includes("dining")
  ) {
    return "venueCatering";
  }
  if (
    lower.includes("allow") ||
    lower.includes("smoking") ||
    lower.includes("alcohol") ||
    lower.includes("music") ||
    lower.includes("dj") ||
    lower.includes("decorator") ||
    lower.includes("pet")
  ) {
    return "venueRule";
  }
  if (
    lower.includes("wedding") ||
    lower.includes("corporate") ||
    lower.includes("conference") ||
    lower.includes("seminar") ||
    lower.includes("party") ||
    lower.includes("exhibition") ||
    lower.includes("engagement")
  ) {
    return "suitableFor";
  }
  if (lower.includes("indoor") || lower.includes("outdoor")) return "indoorOutdoor";
  if (
    lower.includes("wifi") ||
    lower.includes("wi-fi") ||
    lower.includes("air condition") ||
    lower.includes("ac ")
  ) {
    return "venueAmenities";
  }
  if (
    lower.includes("stage") ||
    lower.includes("sound") ||
    lower.includes("projector") ||
    lower.includes("restroom") ||
    lower.includes("bridal") ||
    lower.includes("dance")
  ) {
    return "venueFacility";
  }
  return "amenity";
}

/** Group flat amenity labels into taxonomy tab categories for guest display. */
export function groupVenueAmenities(
  amenities: string[],
  taxonomy: TaxonomyData
): VenueAmenityGroup[] {
  const groups = new Map<string, VenueAmenityGroup>();
  const seen = new Set<string>();

  for (const amenity of amenities) {
    const label = amenity.trim();
    if (!label) continue;
    const key = normalizeLabel(label);
    if (seen.has(key)) continue;
    seen.add(key);

    const match = taxonomy.extraFilters.find((item) => normalizeLabel(item.name) === key);
    const typeId = match?.type ?? inferGroupId(label);
    const info = tabInfo(taxonomy, typeId);
    const existing = groups.get(typeId);

    if (existing) {
      existing.items.push(label);
      continue;
    }

    groups.set(typeId, {
      id: typeId,
      label: info.label,
      section: info.section,
      items: [label],
    });
  }

  const ordered: VenueAmenityGroup[] = [];
  const added = new Set<string>();

  for (const tab of taxonomy.extraTabs) {
    const group = groups.get(tab.id);
    if (!group?.items.length) continue;
    ordered.push({
      ...group,
      label: tab.label,
      section: inferExtraTabListingSection(tab),
    });
    added.add(tab.id);
  }

  for (const id of Array.from(groups.keys())) {
    if (added.has(id)) continue;
    const group = groups.get(id);
    if (!group?.items.length) continue;
    ordered.push(group);
  }

  return ordered;
}

export function splitVenueAmenityGroups(groups: VenueAmenityGroup[]) {
  const venueDetails = groups.filter((group) => group.section === "venueDetails");
  const venueOptions = groups.filter((group) => group.section === "venueOptions");
  return { venueDetails, venueOptions };
}

function resolveAmenitySection(amenity: string, taxonomy: TaxonomyData): VenueAmenitySection {
  const label = amenity.trim();
  if (!label) return "venueOptions";
  const key = normalizeLabel(label);
  const match = taxonomy.extraFilters.find((item) => normalizeLabel(item.name) === key);
  const typeId = match?.type ?? inferGroupId(label);
  return tabInfo(taxonomy, typeId).section;
}

/** On multi-rate venues, keep only listing-level filters (parking, catering, rules, tags, etc.). */
export function filterListingLevelVenueAmenities(
  amenities: string[],
  taxonomy: TaxonomyData,
  multiRate: boolean
): string[] {
  if (!multiRate) return amenities;
  return amenities.filter(
    (amenity) => resolveAmenitySection(amenity, taxonomy) === "venueOptions"
  );
}
