/** True when a listing is an Events / Venue directory product (not a paid stay booking). */
export function isEventListing(input: {
  parentCategory?: string | null;
  type?: string | null;
  category?: string | null;
}): boolean {
  const parent = (input.parentCategory ?? "").toLowerCase();
  const type = (input.type ?? "").toLowerCase();
  const category = (input.category ?? "").toLowerCase();
  if (type === "venue" || type.includes("venue") || type.includes("event")) return true;
  if (parent.includes("venue") || /\bevents?\b/.test(parent)) return true;
  if (category === "venue") return true;
  return false;
}
