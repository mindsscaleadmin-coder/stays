import type { ListingQualityForm, ListingQualityRules } from "@/lib/admin/listing-quality-rules-types";
import { getQualityFieldDef, qualityRuleKey } from "@/lib/admin/listing-quality-fields";
import { loadListingQualityRules } from "@/lib/admin/listing-quality-rules-data";

export interface ListingQualityInput {
  title?: string;
  description?: string;
  photoCount?: number;
  country?: string;
  state?: string;
  district?: string;
  parentCategory?: string;
  category?: string;
  subcategory?: string;
  highlightCount?: number;
  featureIconCount?: number;
  advancedCount?: number;
  mapEmbedUrl?: string;
  farmType?: string;
  amenities?: string[];
  farmActivities?: string[];
  livestockCrops?: string;
  roomsCount?: number;
  houseRulesCount?: number;
  customSelections?: Record<string, string>;
  customFilters?: { label: string; value: string }[];
}

export type QualityCheckId = string;

export type QualityCheckItem = {
  id: QualityCheckId;
  label: string;
  required: boolean;
  passed: boolean;
  detail?: string;
};

export interface QualityValidateOptions {
  omit?: QualityCheckId[];
  /** Skip manage-only fields on the create/edit listing form. */
  form?: ListingQualityForm | "all";
}

function filled(value?: string | null) {
  return Boolean(value?.trim());
}

function countForField(fieldId: string, input: ListingQualityInput): number {
  switch (fieldId) {
    case "description":
      return input.description?.trim().length ?? 0;
    case "photos":
      return input.photoCount ?? 0;
    case "highlights":
      return input.highlightCount ?? 0;
    case "featureIcons":
      return input.featureIconCount ?? 0;
    case "advancedFilters":
      return input.advancedCount ?? 0;
    case "amenities":
      return input.amenities?.length ?? 0;
    case "farmActivities":
      return input.farmActivities?.length ?? 0;
    case "rooms":
      return input.roomsCount ?? 0;
    case "houseRules":
      return input.houseRulesCount ?? 0;
    default:
      return 0;
  }
}

function valueForRequired(fieldId: string, input: ListingQualityInput) {
  switch (fieldId) {
    case "title":
      return filled(input.title);
    case "description":
      return filled(input.description);
    case "country":
      return filled(input.country);
    case "state":
      return filled(input.state);
    case "district":
      return filled(input.district);
    case "parentCategory":
      return filled(input.parentCategory);
    case "category":
      return filled(input.category);
    case "subcategory":
      return filled(input.subcategory);
    case "mapEmbed":
      return filled(input.mapEmbedUrl);
    case "farmType":
      return filled(input.farmType);
    case "livestockCrops":
      return filled(input.livestockCrops);
    default:
      return countForField(fieldId, input) > 0;
  }
}

function customFilled(input: ListingQualityInput, tabId?: string, label?: string) {
  if (tabId && filled(input.customSelections?.[tabId])) return true;
  if (label) {
    return filled(
      input.customFilters?.find(
        (filter) => filter.label.trim().toLowerCase() === label.trim().toLowerCase()
      )?.value
    );
  }
  return false;
}

function ruleLabel(rule: ListingQualityRules["items"][number]) {
  if (rule.fieldId === "custom") return rule.label?.trim() || "Custom field";
  return getQualityFieldDef(rule.fieldId)?.label ?? rule.label ?? rule.fieldId;
}

function ruleApplies(
  rule: ListingQualityRules["items"][number],
  options?: QualityValidateOptions
) {
  const key = qualityRuleKey(rule);
  if (options?.omit?.includes(key) || options?.omit?.includes(rule.fieldId)) return false;
  const form = options?.form ?? "all";
  if (form === "all") return true;
  if (rule.fieldId === "custom") return form === "details";
  const def = getQualityFieldDef(rule.fieldId);
  return !def || def.form === form;
}

function evaluateRule(
  rule: ListingQualityRules["items"][number],
  input: ListingQualityInput
): { passed: boolean; detail?: string; message: string } {
  const label = ruleLabel(rule);
  const min = Math.max(1, rule.min ?? 1);

  if (rule.fieldId === "custom") {
    const passed = customFilled(input, rule.customTabId, rule.label);
    return {
      passed,
      message: `${label} is required.`,
    };
  }

  if (rule.kind === "minLength") {
    const len = countForField(rule.fieldId, input);
    return {
      passed: len >= min,
      detail: `${len}/${min} characters`,
      message:
        len === 0
          ? `${label} is required.`
          : `${label} must be at least ${min} characters.`,
    };
  }

  if (rule.kind === "minCount") {
    const count = countForField(rule.fieldId, input);
    const unit = label.toLowerCase();
    return {
      passed: count >= min,
      detail: `${count}/${min}`,
      message: `Add at least ${min} ${unit}.`,
    };
  }

  const passed = valueForRequired(rule.fieldId, input);
  return {
    passed,
    message: `${label} is required.`,
  };
}

export function validateListingQuality(
  input: ListingQualityInput,
  rules: ListingQualityRules,
  options?: QualityValidateOptions
): string | null {
  for (const rule of rules.items) {
    if (!ruleApplies(rule, options)) continue;
    const result = evaluateRule(rule, input);
    if (!result.passed) return result.message;
  }
  return null;
}

export function validateAgainstCurrentQualityRules(
  input: ListingQualityInput,
  options?: QualityValidateOptions
): string | null {
  return validateListingQuality(input, loadListingQualityRules(), options);
}

export function buildQualityChecklist(
  input: ListingQualityInput,
  rules: ListingQualityRules = loadListingQualityRules(),
  options?: QualityValidateOptions
): QualityCheckItem[] {
  return rules.items.filter((rule) => ruleApplies(rule, options)).map((rule) => {
    const result = evaluateRule(rule, input);
    return {
      id: qualityRuleKey(rule),
      label: ruleLabel(rule),
      required: true,
      passed: result.passed,
      detail: result.detail,
    };
  });
}

export function qualityChecksPassed(items: QualityCheckItem[]): boolean {
  return items.every((item) => !item.required || item.passed);
}

export function qualityInputFromListing(listing: {
  title?: string;
  description?: string;
  photoCount?: number;
  photoUrls?: string[];
  country?: string;
  state?: string;
  district?: string;
  parentCategory?: string;
  category?: string;
  subcategory?: string;
  highlightIds?: string[];
  featureIconIds?: string[];
  advancedFilters?: string[];
  mapEmbedUrl?: string;
  farmType?: string;
  amenities?: string[];
  farmActivities?: string[];
  livestockCrops?: string;
  rooms?: { id?: string }[];
  houseRules?: { title?: string }[];
  customFilters?: { label: string; value: string }[];
}): ListingQualityInput {
  return {
    title: listing.title,
    description: listing.description,
    photoCount: listing.photoCount ?? listing.photoUrls?.length ?? 0,
    country: listing.country,
    state: listing.state,
    district: listing.district,
    parentCategory: listing.parentCategory,
    category: listing.category,
    subcategory: listing.subcategory,
    highlightCount: listing.highlightIds?.length ?? 0,
    featureIconCount: listing.featureIconIds?.length ?? 0,
    advancedCount: listing.advancedFilters?.length ?? 0,
    mapEmbedUrl: listing.mapEmbedUrl,
    farmType: listing.farmType,
    amenities: listing.amenities,
    farmActivities: listing.farmActivities,
    livestockCrops: listing.livestockCrops,
    roomsCount: listing.rooms?.length ?? 0,
    houseRulesCount: listing.houseRules?.length ?? 0,
    customFilters: listing.customFilters,
  };
}
