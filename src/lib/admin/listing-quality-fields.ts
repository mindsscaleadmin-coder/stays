import type {
  ListingQualityFieldDef,
  ListingQualityFieldId,
  ListingQualityRuleItem,
} from "./listing-quality-rules-types";

export const LISTING_QUALITY_FIELD_CATALOG: ListingQualityFieldDef[] = [
  { id: "title", label: "Title", form: "details", kind: "required" },
  {
    id: "description",
    label: "Description",
    form: "details",
    kind: "minLength",
    defaultMin: 50,
    minLabel: "Min characters",
  },
  {
    id: "photos",
    label: "Photos",
    form: "details",
    kind: "minCount",
    defaultMin: 1,
    minLabel: "Minimum photos",
  },
  { id: "country", label: "Country", form: "details", kind: "required" },
  { id: "state", label: "State", form: "details", kind: "required" },
  { id: "district", label: "District", form: "details", kind: "required" },
  { id: "parentCategory", label: "Parent category", form: "details", kind: "required" },
  { id: "category", label: "Category", form: "details", kind: "required" },
  { id: "subcategory", label: "Sub category", form: "details", kind: "required" },
  {
    id: "highlights",
    label: "Highlights",
    form: "details",
    kind: "minCount",
    defaultMin: 1,
    minLabel: "Minimum highlights",
  },
  {
    id: "featureIcons",
    label: "Feature icons",
    form: "details",
    kind: "minCount",
    defaultMin: 1,
    minLabel: "Minimum icons",
  },
  {
    id: "advancedFilters",
    label: "Advanced filters",
    form: "details",
    kind: "minCount",
    defaultMin: 1,
    minLabel: "Minimum selected",
  },
  { id: "mapEmbed", label: "Embed map", form: "details", kind: "required" },
  {
    id: "meetingPoint",
    label: "Meeting point",
    form: "details",
    kind: "required",
    modes: ["experience"],
  },
  {
    id: "requirements",
    label: "Requirements / safety",
    form: "details",
    kind: "required",
    modes: ["experience"],
  },
  {
    id: "itinerary",
    label: "Itinerary steps",
    form: "details",
    kind: "minCount",
    defaultMin: 1,
    minLabel: "Minimum steps",
    modes: ["experience"],
  },
  {
    id: "farmType",
    label: "Farm type",
    form: "manage",
    kind: "required",
    modes: ["stay"],
  },
  {
    id: "amenities",
    label: "Amenities",
    form: "manage",
    kind: "minCount",
    defaultMin: 1,
    minLabel: "Minimum amenities",
  },
  {
    id: "farmActivities",
    label: "Farm activities",
    form: "manage",
    kind: "minCount",
    defaultMin: 1,
    minLabel: "Minimum activities",
    modes: ["stay"],
  },
  {
    id: "livestockCrops",
    label: "Livestock / crops",
    form: "manage",
    kind: "required",
    modes: ["stay"],
  },
  {
    id: "rooms",
    label: "Rooms",
    form: "manage",
    kind: "minCount",
    defaultMin: 1,
    minLabel: "Minimum rooms",
    modes: ["stay"],
  },
];

export function getQualityFieldDef(
  fieldId: ListingQualityFieldId
): ListingQualityFieldDef | undefined {
  if (fieldId === "custom") return undefined;
  return LISTING_QUALITY_FIELD_CATALOG.find((field) => field.id === fieldId);
}

export function qualityRuleKey(rule: Pick<ListingQualityRuleItem, "fieldId" | "customTabId">) {
  return rule.fieldId === "custom" ? `custom:${rule.customTabId ?? ""}` : rule.fieldId;
}

export function createQualityRule(
  fieldId: Exclude<ListingQualityFieldId, "custom">
): ListingQualityRuleItem {
  const def = getQualityFieldDef(fieldId);
  return {
    id: fieldId,
    fieldId,
    kind: def?.kind ?? "required",
    min: def?.kind === "required" ? undefined : (def?.defaultMin ?? 1),
    label: def?.label,
  };
}

export function createCustomQualityRule(tabId: string, label: string): ListingQualityRuleItem {
  return {
    id: `custom:${tabId}`,
    fieldId: "custom",
    kind: "required",
    customTabId: tabId,
    label,
  };
}
