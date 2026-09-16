/** True when a listing is a Dining directory product (not a paid stay booking). */
export function isDiningListing(input: {
  parentCategory?: string | null;
  type?: string | null;
  category?: string | null;
}): boolean {
  const parent = (input.parentCategory ?? "").toLowerCase();
  const type = (input.type ?? "").toLowerCase();
  const category = (input.category ?? "").toLowerCase();
  if (type === "dining" || type.includes("dining")) return true;
  if (parent.includes("dining")) return true;
  if (category === "dining") return true;
  return false;
}
