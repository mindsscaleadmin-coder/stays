export const DINING_GALLERY_FILTERS = [
  { id: "all", label: "All", match: () => true },
  { id: "food", label: "Food", match: (tag: string) => /food|dish|menu/i.test(tag) },
  {
    id: "dining-area",
    label: "Dining area",
    match: (tag: string) => /dining|table|interior/i.test(tag),
  },
  { id: "outdoor", label: "Outdoor", match: (tag: string) => /outdoor|terrace|garden|rooftop/i.test(tag) },
  { id: "bar", label: "Bar", match: (tag: string) => /bar|drink/i.test(tag) },
  {
    id: "private",
    label: "Private dining",
    match: (tag: string) => /private|majlis|room/i.test(tag),
  },
] as const;

export function filterDiningGalleryPhotos<T extends { tag?: string }>(
  photos: T[],
  filterId: string
): T[] {
  const filter = DINING_GALLERY_FILTERS.find((item) => item.id === filterId) ?? DINING_GALLERY_FILTERS[0];
  if (filter.id === "all") return photos;
  return photos.filter((photo) => filter.match((photo.tag ?? "").toLowerCase()));
}
