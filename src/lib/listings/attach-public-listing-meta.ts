import { listListingReviewStats } from "@/lib/booking/stay-reviews-repo";
import { getActivePromotedListingIdsFromDb } from "@/lib/listings/promotions-repo";
import type { SubmittedListing } from "./submission-types";

/** Overlay published review scores and active Trending IDs from the same DB. */
export async function attachPublicListingMeta(
  listings: SubmittedListing[]
): Promise<SubmittedListing[]> {
  if (listings.length === 0) return listings;

  const [stats, trendingIds] = await Promise.all([
    listListingReviewStats(listings.map((listing) => listing.id)),
    getActivePromotedListingIdsFromDb("trending"),
  ]);
  const trending = new Set(trendingIds);

  return listings.map((listing) => {
    const review = stats.get(listing.id);
    return {
      ...listing,
      guestRating: review?.rating ?? 0,
      guestReviewCount: review?.reviews ?? 0,
      trending: trending.has(listing.id),
    };
  });
}
