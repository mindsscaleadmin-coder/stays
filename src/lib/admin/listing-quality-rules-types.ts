export type ListingQualityForm = "details" | "manage";

export type ListingQualityMode = "stay" | "experience" | "event";

export type ListingQualityFieldKind = "required" | "minLength" | "minCount";

export type ListingQualityFieldId =
  | "title"
  | "description"
  | "photos"
  | "country"
  | "state"
  | "district"
  | "parentCategory"
  | "category"
  | "subcategory"
  | "highlights"
  | "featureIcons"
  | "advancedFilters"
  | "mapEmbed"
  | "farmType"
  | "amenities"
  | "farmActivities"
  | "livestockCrops"
  | "rooms"
  | "meetingPoint"
  | "requirements"
  | "itinerary"
  | "custom";

export interface ListingQualityFieldDef {
  id: Exclude<ListingQualityFieldId, "custom">;
  label: string;
  form: ListingQualityForm;
  kind: ListingQualityFieldKind;
  defaultMin?: number;
  minLabel?: string;
  /** When set, rule only applies to these listing modes. Omit = every mode. */
  modes?: ListingQualityMode[];
}

export interface ListingQualityRuleItem {
  id: string;
  fieldId: ListingQualityFieldId;
  kind: ListingQualityFieldKind;
  min?: number;
  /** Custom taxonomy tab on the listing form (beds, guests, …). */
  customTabId?: string;
  /** Snapshot of the tab label if taxonomy is later removed. */
  label?: string;
}

export interface ListingQualityRules {
  items: ListingQualityRuleItem[];
}

/** Platform rules keyed by parent category id (Stays, Experiences, Events, …). */
export interface ListingQualityRulesStore {
  /** Used when a parent has no override yet. */
  fallback: ListingQualityRules;
  /** Per-parent overrides keyed by taxonomy parent id. */
  byParentId: Record<string, ListingQualityRules>;
}

/** Pre-items shape still present in some browsers. */
export interface LegacyListingQualityRules {
  minPhotos?: number;
  requireTitle?: boolean;
  requireDescription?: boolean;
  minDescriptionLength?: number;
  requireLocation?: boolean;
  requireCategory?: boolean;
  requireFarmType?: boolean;
  requireAmenities?: boolean;
  minAmenities?: number;
  items?: ListingQualityRuleItem[];
  fallback?: ListingQualityRules;
  byParentId?: Record<string, ListingQualityRules>;
}
