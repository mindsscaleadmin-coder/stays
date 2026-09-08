/** True when a listing is an Experience product (session slots), not a stay. */
export function isExperienceListing(input: {
  parentCategory?: string | null;
  type?: string | null;
}): boolean {
  const parent = (input.parentCategory ?? "").toLowerCase();
  const type = (input.type ?? "").toLowerCase();
  return parent.includes("experience") || type === "experience" || type.includes("experience");
}
