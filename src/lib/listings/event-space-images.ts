import { LISTING_PLACEHOLDER_IMG } from "@/lib/listings/submission-to-stay";

/** Gallery photos tagged for a venue space (matches host upload tags). */
export function eventSpaceImages(
  space: { name: string; img: string },
  galleryPhotos?: { src: string; tag?: string }[]
): string[] {
  const spaceName = space.name.trim();
  const images: string[] = [];
  const seen = new Set<string>();

  function add(url: string) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    images.push(url);
  }

  if (space.img) add(space.img);

  for (const photo of galleryPhotos ?? []) {
    const tag = photo.tag?.trim();
    if (!tag || !spaceName) continue;
    if (tag.toLowerCase() === spaceName.toLowerCase()) {
      add(photo.src);
    }
  }

  if (images.length === 0) {
    add(space.img || LISTING_PLACEHOLDER_IMG);
  }

  return images;
}
