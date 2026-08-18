import type { ListingQualityRules } from "@/lib/admin/listing-quality-rules-types";
import { loadListingQualityRules } from "@/lib/admin/listing-quality-rules-data";

export interface ListingQualityInput {
  title?: string;
  description?: string;
  photoCount?: number;
  country?: string;
  state?: string;
  parentCategory?: string;
  farmType?: string;
  amenities?: string[];
  houseRulesCount?: number;
}

export type QualityCheckId =
  | "title"
  | "description"
  | "photos"
  | "location"
  | "category"
  | "farmType"
  | "amenities";

export type QualityCheckItem = {
  id: QualityCheckId;
  label: string;
  required: boolean;
  passed: boolean;
  detail?: string;
};

export function validateListingQuality(
  input: ListingQualityInput,
  rules: ListingQualityRules,
  options?: { omit?: QualityCheckId[] }
): string | null {
  const omit = new Set(options?.omit ?? []);

  if (!omit.has("title") && rules.requireTitle && !input.title?.trim()) {
    return "Title is required.";
  }

  if (!omit.has("description") && rules.requireDescription) {
    const desc = input.description?.trim() ?? "";
    if (!desc) return "Description is required.";
    if (desc.length < rules.minDescriptionLength) {
      return `Description must be at least ${rules.minDescriptionLength} characters.`;
    }
  }

  if (!omit.has("photos") && rules.minPhotos > 0 && (input.photoCount ?? 0) < rules.minPhotos) {
    return `Upload at least ${rules.minPhotos} photo${rules.minPhotos === 1 ? "" : "s"}.`;
  }

  if (
    !omit.has("location") &&
    rules.requireLocation &&
    (!input.country?.trim() || !input.state?.trim())
  ) {
    return "Country and state are required.";
  }

  if (!omit.has("category") && rules.requireCategory && !input.parentCategory?.trim()) {
    return "Category is required.";
  }

  if (!omit.has("farmType") && rules.requireFarmType && !input.farmType?.trim()) {
    return "Farm type is required.";
  }

  if (!omit.has("amenities") && (rules.requireAmenities || rules.minAmenities > 0)) {
    const count = input.amenities?.length ?? 0;
    const min = rules.requireAmenities ? Math.max(1, rules.minAmenities) : rules.minAmenities;
    if (count < min) {
      return min === 1
        ? "Select at least one amenity."
        : `Select at least ${min} amenities.`;
    }
  }

  return null;
}

/** Validate against currently saved admin quality rules. */
export function validateAgainstCurrentQualityRules(
  input: ListingQualityInput,
  options?: { omit?: QualityCheckId[] }
): string | null {
  return validateListingQuality(input, loadListingQualityRules(), options);
}

/** Build a live checklist for host forms (required items only). */
export function buildQualityChecklist(
  input: ListingQualityInput,
  rules: ListingQualityRules = loadListingQualityRules(),
  options?: { omit?: QualityCheckId[] }
): QualityCheckItem[] {
  const omit = new Set(options?.omit ?? []);
  const items: QualityCheckItem[] = [];

  if (!omit.has("title") && rules.requireTitle) {
    items.push({
      id: "title",
      label: "Title",
      required: true,
      passed: Boolean(input.title?.trim()),
    });
  }

  if (!omit.has("description") && rules.requireDescription) {
    const len = input.description?.trim().length ?? 0;
    const passed = len >= Math.max(1, rules.minDescriptionLength);
    items.push({
      id: "description",
      label: "Description",
      required: true,
      passed,
      detail:
        rules.minDescriptionLength > 0
          ? `${len}/${rules.minDescriptionLength} characters`
          : undefined,
    });
  }

  if (!omit.has("photos") && rules.minPhotos > 0) {
    const count = input.photoCount ?? 0;
    items.push({
      id: "photos",
      label: "Photos",
      required: true,
      passed: count >= rules.minPhotos,
      detail: `${count}/${rules.minPhotos}`,
    });
  }

  if (!omit.has("location") && rules.requireLocation) {
    items.push({
      id: "location",
      label: "Country & state",
      required: true,
      passed: Boolean(input.country?.trim() && input.state?.trim()),
    });
  }

  if (!omit.has("category") && rules.requireCategory) {
    items.push({
      id: "category",
      label: "Category",
      required: true,
      passed: Boolean(input.parentCategory?.trim()),
    });
  }

  if (!omit.has("farmType") && rules.requireFarmType) {
    items.push({
      id: "farmType",
      label: "Farm type",
      required: true,
      passed: Boolean(input.farmType?.trim()),
      detail: "Set on Manage listing if missing",
    });
  }

  if (!omit.has("amenities") && (rules.requireAmenities || rules.minAmenities > 0)) {
    const count = input.amenities?.length ?? 0;
    const min = rules.requireAmenities ? Math.max(1, rules.minAmenities) : rules.minAmenities;
    items.push({
      id: "amenities",
      label: "Amenities",
      required: true,
      passed: count >= min,
      detail: `${count}/${min}${!input.amenities?.length ? " · set on Manage listing" : ""}`,
    });
  }

  return items;
}

export function qualityChecksPassed(items: QualityCheckItem[]): boolean {
  return items.every((i) => !i.required || i.passed);
}
