/**
 * Client-side cache of featured listing IDs from the same DB search uses.
 * Merged with localStorage promos so ranking stays consistent after refresh.
 */
let cachedFeaturedIds: string[] = [];
let cachedTrendingIds: string[] = [];
let lastFetchedAt = 0;

const CACHE_MS = 30_000;
let refreshInflight: Promise<void> | null = null;

export function getCachedPromotedIds(kind: "featured" | "trending"): string[] {
  return kind === "featured" ? [...cachedFeaturedIds] : [...cachedTrendingIds];
}

export function setCachedPromotedIds(
  kind: "featured" | "trending",
  ids: string[]
): void {
  if (kind === "featured") cachedFeaturedIds = [...ids];
  else cachedTrendingIds = [...ids];
  lastFetchedAt = Date.now();
}

export function mergePromotedIds(
  kind: "featured" | "trending",
  localIds: string[]
): string[] {
  const cached = getCachedPromotedIds(kind);
  const merged = [...cached];
  for (const id of localIds) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

export async function refreshPromotedIdsFromApi(force = false): Promise<void> {
  if (!force && Date.now() - lastFetchedAt < CACHE_MS) return;
  if (refreshInflight) return refreshInflight;

  refreshInflight = (async () => {
    try {
      const [featuredRes, trendingRes] = await Promise.all([
        fetch("/api/promotions/active?kind=featured"),
        fetch("/api/promotions/active?kind=trending"),
      ]);
      if (featuredRes.ok) {
        const data = await featuredRes.json();
        if (Array.isArray(data.listingIds)) {
          setCachedPromotedIds("featured", data.listingIds);
        }
      }
      if (trendingRes.ok) {
        const data = await trendingRes.json();
        if (Array.isArray(data.listingIds)) {
          setCachedPromotedIds("trending", data.listingIds);
        }
      }
    } catch {
      // keep cache
    }
  })().finally(() => {
    refreshInflight = null;
  });

  return refreshInflight;
}
