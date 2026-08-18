import type {
  PhotoTagCatalogItem,
  PhotoTagCatalogItemInput,
} from "./photo-tags-catalog-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-photo-tags-catalog";
export const PHOTO_TAGS_CATALOG_SYNC_EVENT = "farm-stays-photo-tags-catalog-updated";

/** Built-in tags hosts see until admin customizes the catalog. */
export const DEFAULT_PHOTO_TAGS_CATALOG: PhotoTagCatalogItem[] = [
  { id: "pt-cover", value: "cover", label: "Cover / Exterior", enabled: true },
  { id: "pt-kitchen", value: "kitchen", label: "Kitchen", enabled: true },
  { id: "pt-dining", value: "dining", label: "Dining room", enabled: true },
  { id: "pt-living", value: "living", label: "Living room", enabled: true },
  { id: "pt-master-bedroom", value: "master-bedroom", label: "Master bedroom", enabled: true },
  { id: "pt-bedroom", value: "bedroom", label: "Bedroom", enabled: true },
  { id: "pt-bathroom", value: "bathroom", label: "Bathroom", enabled: true },
  { id: "pt-balcony", value: "balcony", label: "Balcony", enabled: true },
  { id: "pt-pool", value: "pool", label: "Pool", enabled: true },
  { id: "pt-garden", value: "garden", label: "Garden", enabled: true },
  { id: "pt-bbq", value: "bbq", label: "BBQ area", enabled: true },
  { id: "pt-river-view", value: "river-view", label: "River view", enabled: true },
  { id: "pt-mountain-view", value: "mountain-view", label: "Mountain view", enabled: true },
  { id: "pt-farm-view", value: "farm-view", label: "Farm view", enabled: true },
  { id: "pt-parking", value: "parking", label: "Parking", enabled: true },
  { id: "pt-entrance", value: "entrance", label: "Entrance", enabled: true },
  { id: "pt-other", value: "other", label: "Other", enabled: true },
];

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(PHOTO_TAGS_CATALOG_SYNC_EVENT);
}

export function newPhotoTagCatalogId(): string {
  return `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function normalizeItem(item: PhotoTagCatalogItem): PhotoTagCatalogItem {
  const label = (item.label || "").trim() || "Untitled";
  const value =
    (item.value || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") ||
    slugify(label) ||
    item.id;
  return {
    id: item.id,
    value,
    label,
    enabled: item.enabled !== false,
  };
}

export function loadPhotoTagsCatalog(): PhotoTagCatalogItem[] {
  if (typeof window === "undefined") return DEFAULT_PHOTO_TAGS_CATALOG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PHOTO_TAGS_CATALOG;
    const parsed = JSON.parse(raw) as PhotoTagCatalogItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PHOTO_TAGS_CATALOG;
    return parsed.map(normalizeItem);
  } catch {
    return DEFAULT_PHOTO_TAGS_CATALOG;
  }
}

export function savePhotoTagsCatalog(items: PhotoTagCatalogItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(normalizeItem)));
  notify();
}

export function enabledPhotoTags(
  items: PhotoTagCatalogItem[] = loadPhotoTagsCatalog()
): PhotoTagCatalogItem[] {
  return items.filter((i) => i.enabled);
}

export function createPhotoTagItem(
  input: Omit<PhotoTagCatalogItemInput, "value"> & { value?: string }
): PhotoTagCatalogItem {
  const label = input.label.trim();
  return normalizeItem({
    id: newPhotoTagCatalogId(),
    value: input.value?.trim() || slugify(label),
    label,
    enabled: input.enabled !== false,
  });
}

export function resolvePhotoTagLabel(
  valueOrLabel: string,
  items: PhotoTagCatalogItem[] = loadPhotoTagsCatalog()
): string {
  const raw = valueOrLabel.trim();
  if (!raw) return "";
  const found = items.find(
    (t) =>
      t.value === raw ||
      t.label === raw ||
      t.label.toLowerCase() === raw.toLowerCase()
  );
  return found?.label ?? raw;
}
