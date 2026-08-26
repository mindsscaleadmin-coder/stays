import type {
  LegacyListingQualityRules,
  ListingQualityRuleItem,
  ListingQualityRules,
} from "./listing-quality-rules-types";
import {
  createQualityRule,
  getQualityFieldDef,
  qualityRuleKey,
} from "./listing-quality-fields";
import { emitSyncCustomEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-listing-quality-rules";
export const LISTING_QUALITY_RULES_SYNC_EVENT = "farm-stays-listing-quality-rules-updated";

export const DEFAULT_LISTING_QUALITY_RULES: ListingQualityRules = {
  items: [
    createQualityRule("title"),
    createQualityRule("description"),
    createQualityRule("photos"),
    createQualityRule("country"),
    createQualityRule("state"),
    createQualityRule("parentCategory"),
  ],
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(LISTING_QUALITY_RULES_SYNC_EVENT);
  }
}

function sanitizeItem(raw: Partial<ListingQualityRuleItem>): ListingQualityRuleItem | null {
  if (!raw || typeof raw.fieldId !== "string") return null;
  if (raw.fieldId === "custom") {
    const tabId = raw.customTabId?.trim();
    if (!tabId) return null;
    return {
      id: raw.id?.trim() || `custom:${tabId}`,
      fieldId: "custom",
      kind: "required",
      customTabId: tabId,
      label: raw.label?.trim() || tabId,
    };
  }

  const def = getQualityFieldDef(raw.fieldId);
  if (!def) return null;
  const min =
    def.kind === "required"
      ? undefined
      : Math.max(1, Number(raw.min ?? def.defaultMin ?? 1) || 1);
  return {
    id: raw.id?.trim() || def.id,
    fieldId: def.id,
    kind: def.kind,
    min,
    label: def.label,
  };
}

const LEGACY_FIELD_IDS = new Set([
  "title",
  "description",
  "photos",
  "country",
  "state",
  "parentCategory",
  "farmType",
  "amenities",
]);

export function toLegacyQualityView(rules: ListingQualityRules): Required<
  Pick<
    LegacyListingQualityRules,
    | "minPhotos"
    | "requireTitle"
    | "requireDescription"
    | "minDescriptionLength"
    | "requireLocation"
    | "requireCategory"
    | "requireFarmType"
    | "requireAmenities"
    | "minAmenities"
  >
> {
  const has = (id: string) => rules.items.some((item) => item.fieldId === id);
  const item = (id: string) => rules.items.find((row) => row.fieldId === id);
  return {
    minPhotos: item("photos")?.min ?? 0,
    requireTitle: has("title"),
    requireDescription: has("description"),
    minDescriptionLength: item("description")?.min ?? 50,
    requireLocation: has("country") || has("state"),
    requireCategory: has("parentCategory") || has("category"),
    requireFarmType: has("farmType"),
    requireAmenities: has("amenities"),
    minAmenities: item("amenities")?.min ?? 0,
  };
}

function fromLegacy(legacy: LegacyListingQualityRules): ListingQualityRuleItem[] {
  const items: ListingQualityRuleItem[] = [];
  if (legacy.requireTitle !== false) items.push(createQualityRule("title"));
  if (legacy.requireDescription !== false) {
    const description = createQualityRule("description");
    description.min = Math.max(1, Number(legacy.minDescriptionLength ?? 50) || 50);
    items.push(description);
  }
  if ((legacy.minPhotos ?? 1) > 0) {
    const photos = createQualityRule("photos");
    photos.min = Math.max(1, Number(legacy.minPhotos ?? 1) || 1);
    items.push(photos);
  }
  if (legacy.requireLocation !== false) {
    items.push(createQualityRule("country"));
    items.push(createQualityRule("state"));
  }
  if (legacy.requireCategory !== false) items.push(createQualityRule("parentCategory"));
  if (legacy.requireFarmType) items.push(createQualityRule("farmType"));
  if (legacy.requireAmenities || (legacy.minAmenities ?? 0) > 0) {
    const amenities = createQualityRule("amenities");
    amenities.min = Math.max(
      legacy.requireAmenities ? 1 : 1,
      Number(legacy.minAmenities ?? 1) || 1
    );
    items.push(amenities);
  }
  return items;
}

export function normalizeListingQualityRules(raw: unknown): ListingQualityRules {
  if (!raw || typeof raw !== "object") return DEFAULT_LISTING_QUALITY_RULES;

  const parsed = raw as LegacyListingQualityRules;
  const source = Array.isArray(parsed.items) ? parsed.items : fromLegacy(parsed);
  const seen = new Set<string>();
  const items: ListingQualityRuleItem[] = [];
  for (const entry of source) {
    const item = sanitizeItem(entry);
    if (!item) continue;
    const key = qualityRuleKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return { items };
}

export function loadListingQualityRules(): ListingQualityRules {
  if (typeof window === "undefined") return DEFAULT_LISTING_QUALITY_RULES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_LISTING_QUALITY_RULES;
    return normalizeListingQualityRules(JSON.parse(stored));
  } catch {
    return DEFAULT_LISTING_QUALITY_RULES;
  }
}

export function applyLegacyQualityPatch(
  current: ListingQualityRules,
  patch: Partial<LegacyListingQualityRules>
): ListingQualityRules {
  const extras = current.items.filter((item) => !LEGACY_FIELD_IDS.has(item.fieldId));
  return {
    items: [...fromLegacy({ ...toLegacyQualityView(current), ...patch }), ...extras],
  };
}

export function saveListingQualityRules(rules: ListingQualityRules): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeListingQualityRules(rules)));
  dispatchSync();
}
