/** Keep listing names on one row at detail-page title size (~text-3xl). */
export const LISTING_TITLE_MAX_WORDS = 8;
export const LISTING_TITLE_MAX_CHARS = 42;

export function listingTitleWordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function clampListingTitle(value: string): string {
  const byChars = value.slice(0, LISTING_TITLE_MAX_CHARS);
  const parts = byChars.split(/(\s+)/);
  let words = 0;
  let out = "";
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      if (words > 0) out += part;
      continue;
    }
    if (!part) continue;
    if (words >= LISTING_TITLE_MAX_WORDS) break;
    out += part;
    words += 1;
  }
  return out;
}
