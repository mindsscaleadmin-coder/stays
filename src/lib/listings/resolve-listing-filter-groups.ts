import { isFilterEnabled } from "@/lib/admin/taxonomy-types";
import type { TaxonomyData } from "@/lib/admin/taxonomy-types";

export type ListingFilterDisplayGroup = {
  id: string;
  label: string;
  kind: "extra" | "feature" | "other";
  items: string[];
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function addToGroup(
  groups: Map<string, ListingFilterDisplayGroup>,
  seen: Set<string>,
  groupId: string,
  label: string,
  kind: ListingFilterDisplayGroup["kind"],
  item: string
) {
  const trimmed = item.trim();
  if (!trimmed) return;
  const key = normalizeName(trimmed);
  if (seen.has(key)) return;
  seen.add(key);

  const existing = groups.get(groupId);
  if (existing) {
    existing.items.push(trimmed);
    return;
  }
  groups.set(groupId, { id: groupId, label, kind, items: [trimmed] });
}

/** Group listing amenities / advanced filters by admin extra-filter tabs and feature filters. */
export function buildListingFilterDisplayGroups(
  taxonomy: TaxonomyData,
  names: string[],
  options?: { includeInstantBooking?: boolean }
): ListingFilterDisplayGroup[] {
  const groups = new Map<string, ListingFilterDisplayGroup>();
  const seen = new Set<string>();

  for (const raw of names) {
    const label = raw.trim();
    if (!label) continue;
    const norm = normalizeName(label);

    const extra =
      taxonomy.extraFilters.find((item) => item.id === label) ??
      taxonomy.extraFilters.find((item) => normalizeName(item.name) === norm);
    if (extra && isFilterEnabled(extra)) {
      const tab = taxonomy.extraTabs.find((item) => item.id === extra.type);
      const tabLabel = tab?.label ?? extra.type;
      addToGroup(groups, seen, `extra:${extra.type}`, tabLabel, "extra", extra.name);
      continue;
    }

    const feature =
      taxonomy.featureFilters.find((item) => item.id === label) ??
      taxonomy.featureFilters.find((item) => normalizeName(item.name) === norm);
    if (feature && isFilterEnabled(feature)) {
      addToGroup(groups, seen, "feature", "Features", "feature", feature.name);
      continue;
    }

    addToGroup(groups, seen, "other", "Amenities", "other", label);
  }

  if (options?.includeInstantBooking && !seen.has("instant booking")) {
    addToGroup(groups, seen, "other", "Amenities", "other", "Instant Booking");
  }

  const ordered: ListingFilterDisplayGroup[] = [];
  const added = new Set<string>();

  for (const tab of taxonomy.extraTabs) {
    const group = groups.get(`extra:${tab.id}`);
    if (!group?.items.length) continue;
    ordered.push({ ...group, label: tab.label });
    added.add(group.id);
  }

  const featureGroup = groups.get("feature");
  if (featureGroup?.items.length) ordered.push(featureGroup);

  const otherGroup = groups.get("other");
  if (otherGroup?.items.length) ordered.push(otherGroup);

  for (const group of groups.values()) {
    if (added.has(group.id) || group.id === "feature" || group.id === "other") continue;
    if (group.items.length) ordered.push(group);
  }

  return ordered;
}
