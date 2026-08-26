/** Normalize a location or country display name for matching. */
export function normalizeLocationName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** URL/path slug; not globally unique — uniqueness is per country + parent. */
export function slugifyLocationName(value: string): string {
  const slug = normalizeLocationName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
}

const JUNK_NAME =
  /^(sl\.?\s*no\.?|s\.?\s*no\.?|serial(?:\s*no\.?)?|sno|name|code|id|state|district|city)$/i;

/** Spreadsheet artifacts that must not become Location rows. */
export function isJunkLocationName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (JUNK_NAME.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (trimmed.length === 1 && !/[a-z]/i.test(trimmed)) return true;
  return false;
}
