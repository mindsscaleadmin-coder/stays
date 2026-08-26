export interface AnnouncementAudience {
  countries: string[];
  parentCategories: string[];
  categories: string[];
}

const COUNTRY_KEYS: Record<string, string> = {
  uae: "ae",
  "united arab emirates": "ae",
  emirates: "ae",
  ksa: "sa",
  "saudi arabia": "sa",
  saudi: "sa",
  oman: "om",
  qatar: "qa",
};

export const ALL_HOSTS_AUDIENCE: AnnouncementAudience = {
  countries: [],
  parentCategories: [],
  categories: [],
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function countryKey(value: string): string {
  const next = norm(value);
  return COUNTRY_KEYS[next] ?? next;
}

function includesCountry(selected: string[], listingCountry: string): boolean {
  if (selected.length === 0) return true;
  const listing = countryKey(listingCountry);
  if (!listing) return false;
  return selected.some((item) => countryKey(item) === listing);
}

function includesTaxonomy(
  selected: string[],
  listing: { parentCategory?: string; category?: string; subcategory?: string }
): boolean {
  if (selected.length === 0) return true;
  const fields = [listing.parentCategory, listing.category, listing.subcategory]
    .map((value) => norm(value ?? ""))
    .filter(Boolean);
  if (fields.length === 0) return false;
  return selected.some((item) => fields.includes(norm(item)));
}

export function normalizeAnnouncementAudience(
  value?: Partial<AnnouncementAudience> | null
): AnnouncementAudience {
  return {
    countries: Array.isArray(value?.countries) ? value.countries.filter(Boolean) : [],
    parentCategories: Array.isArray(value?.parentCategories)
      ? value.parentCategories.filter(Boolean)
      : [],
    categories: Array.isArray(value?.categories) ? value.categories.filter(Boolean) : [],
  };
}

export function isAllHostsAudience(audience?: Partial<AnnouncementAudience> | null): boolean {
  const next = normalizeAnnouncementAudience(audience);
  return (
    next.countries.length === 0 &&
    next.parentCategories.length === 0 &&
    next.categories.length === 0
  );
}

export function listingMatchesAudience(
  listing: {
    country?: string;
    parentCategory?: string;
    category?: string;
    subcategory?: string;
  },
  audience?: Partial<AnnouncementAudience> | null
): boolean {
  const next = normalizeAnnouncementAudience(audience);
  return (
    includesCountry(next.countries, listing.country ?? "") &&
    includesTaxonomy(next.parentCategories, listing) &&
    includesTaxonomy(next.categories, listing)
  );
}

export function announcementsForHost<T extends AnnouncementAudience & { status?: string }>(
  announcements: T[],
  listings: {
    country?: string;
    parentCategory?: string;
    category?: string;
    subcategory?: string;
  }[]
): T[] {
  return announcements.filter((announcement) => {
    if (announcement.status && announcement.status !== "sent") return false;
    if (isAllHostsAudience(announcement)) return true;
    return listings.some((listing) => listingMatchesAudience(listing, announcement));
  });
}

export function formatAudienceLabel(audience?: Partial<AnnouncementAudience> | null): string {
  const next = normalizeAnnouncementAudience(audience);
  if (isAllHostsAudience(next)) return "All hosts";
  const parts: string[] = [];
  if (next.countries.length) parts.push(next.countries.join(", "));
  if (next.parentCategories.length) parts.push(next.parentCategories.join(", "));
  if (next.categories.length) parts.push(next.categories.join(", "));
  return parts.join(" · ");
}
