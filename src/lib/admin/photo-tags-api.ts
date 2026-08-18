import type { PhotoTagCatalogItem } from "./photo-tags-catalog-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedPhotoTags() {
  return isSharedDbEnabled();
}

export async function fetchPhotoTagsFromApi(): Promise<PhotoTagCatalogItem[]> {
  const res = await fetch("/api/platform/photo-tags", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load photo tags");
  const json = (await res.json()) as { items: PhotoTagCatalogItem[] };
  return json.items;
}

export async function savePhotoTagsToApi(
  items: PhotoTagCatalogItem[]
): Promise<PhotoTagCatalogItem[]> {
  const res = await fetch("/api/platform/photo-tags", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Failed to save photo tags");
  const json = (await res.json()) as { items: PhotoTagCatalogItem[] };
  return json.items;
}
