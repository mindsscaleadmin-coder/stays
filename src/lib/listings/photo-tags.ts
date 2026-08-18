import {
  DEFAULT_PHOTO_TAGS_CATALOG,
  loadPhotoTagsCatalog,
  resolvePhotoTagLabel,
} from "@/lib/admin/photo-tags-catalog-data";

/** @deprecated Prefer usePhotoTagsCatalog / loadPhotoTagsCatalog — kept for static fallbacks */
export const LISTING_PHOTO_TAGS = [
  { value: "", label: "No tag" },
  ...DEFAULT_PHOTO_TAGS_CATALOG.map((t) => ({ value: t.value, label: t.label })),
] as const;

export type ListingPhotoTagValue = (typeof LISTING_PHOTO_TAGS)[number]["value"];

export function photoTagLabel(value: string): string {
  if (typeof window === "undefined") {
    return resolvePhotoTagLabel(value, DEFAULT_PHOTO_TAGS_CATALOG);
  }
  return resolvePhotoTagLabel(value, loadPhotoTagsCatalog());
}
