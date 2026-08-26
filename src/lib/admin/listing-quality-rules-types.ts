export type ListingQualityForm = "details" | "manage";

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
  | "custom";

export interface ListingQualityFieldDef {
  id: Exclude<ListingQualityFieldId, "custom">;
  label: string;
  form: ListingQualityForm;
  kind: ListingQualityFieldKind;
  defaultMin?: number;
  minLabel?: string;
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
}
