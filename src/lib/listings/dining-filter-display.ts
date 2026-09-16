import type { TaxonomyData } from "@/lib/admin/taxonomy-types";

export type DiningFilterGroupKey =
  | "diningCuisine"
  | "diningDietary"
  | "diningMeal"
  | "diningFoodStyle"
  | "diningSetting"
  | "diningAtmosphere"
  | "diningAmenity"
  | "diningParking"
  | "diningRule";

export type DiningFilterGroups = Partial<Record<DiningFilterGroupKey, string[]>>;

const DINING_FILTER_TYPES: DiningFilterGroupKey[] = [
  "diningCuisine",
  "diningDietary",
  "diningMeal",
  "diningFoodStyle",
  "diningSetting",
  "diningAtmosphere",
  "diningAmenity",
  "diningParking",
  "diningRule",
];

export function groupDiningFilters(
  taxonomy: TaxonomyData,
  filterIds: string[]
): DiningFilterGroups {
  const groups: DiningFilterGroups = {};
  const idSet = new Set(filterIds);

  for (const filter of taxonomy.extraFilters) {
    if (!idSet.has(filter.id)) continue;
    const type = filter.type as DiningFilterGroupKey;
    if (!DINING_FILTER_TYPES.includes(type)) continue;
    if (!groups[type]) groups[type] = [];
    groups[type]!.push(filter.name);
  }

  return groups;
}

export function primaryCuisineLabel(groups: DiningFilterGroups): string {
  const cuisines = groups.diningCuisine ?? [];
  if (cuisines.length === 0) return "";
  if (cuisines.length <= 3) return cuisines.join(" · ");
  return `${cuisines.slice(0, 3).join(" · ")} +${cuisines.length - 3}`;
}

export function seatingLabel(groups: DiningFilterGroups): string {
  const settings = groups.diningSetting ?? [];
  const hasIndoor = settings.some((item) => item.toLowerCase().includes("indoor"));
  const hasOutdoor = settings.some((item) => item.toLowerCase().includes("outdoor"));
  if (hasIndoor && hasOutdoor) return "Indoor & Outdoor";
  if (hasOutdoor) return "Outdoor";
  if (hasIndoor) return "Indoor";
  if (settings.length > 0) return settings.slice(0, 2).join(" · ");
  return "";
}
