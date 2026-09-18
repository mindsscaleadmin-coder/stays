import type { Stay } from "@/lib/mock/data";
import { getSeedListings } from "./listing-seeds";
import {
  getListing,
  searchListingsPage,
  seedListingsIfEmpty,
} from "@/lib/server/listings-repo";
import { getListingPricingMap } from "@/lib/server/listing-pricing-repo";
import { getActiveFlashDeal } from "@/lib/host/flash-deal-utils";
import { attachPublicListingMeta } from "./attach-public-listing-meta";
import { submissionToStay } from "./submission-to-stay";
import type { SubmittedListing } from "./submission-types";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import type { ListingSearchFilters } from "./match-listing";
import { isDirectoryListing } from "@/lib/booking/is-directory-listing";
import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import { listDiningSubscribedHostIds, listEventSubscribedHostIds } from "@/lib/server/host-profile-repo";
import { getFinancialSettingsFromDb } from "@/lib/server/platform-catalog-repo";
import { eventsDirectoryIsFree } from "@/lib/admin/events-subscription";
import {
  parseListingPagination,
  PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE,
  type ListingPagination,
} from "./listings-pagination";

/**
 * Event listings need a paid subscription to stay public — unless the directory
 * is still in its free launch phase, when approval alone is enough.
 * Boosts never override this.
 */
export function listingVisibleOnPublicCatalog(
  listing: { hostId?: string; parentCategory?: string; type?: string; category?: string },
  subscribedEvents: Set<string>,
  subscribedDining: Set<string>
): boolean {
  if (!isDirectoryListing(listing)) return true;
  const hostId = listing.hostId?.trim();
  if (!hostId) return false;
  if (isEventListing(listing)) return subscribedEvents.has(hostId);
  if (isDiningListing(listing)) return subscribedDining.has(hostId);
  return subscribedEvents.has(hostId) || subscribedDining.has(hostId);
}

/** Reads the admin setting that decides whether Event listings are gated. */
export async function eventsDirectoryFreeForPublicCatalog(): Promise<boolean> {
  try {
    const settings = await getFinancialSettingsFromDb();
    return eventsDirectoryIsFree(settings.eventsSubscription);
  } catch {
    // Settings unreadable — fall back to the launch default (visible).
    return true;
  }
}

export function stayWithPublishedRates(
  listing: SubmittedListing,
  settings: ListingPricingSettings | undefined
): Stay {
  const stay = submissionToStay(listing);
  if (!settings) return stay;
  const base = settings.basePrice > 0 ? settings.basePrice : stay.price;
  const deal = getActiveFlashDeal(settings);
  if (deal) {
    return {
      ...stay,
      price: deal.dealPrice,
      originalPrice: base > deal.dealPrice ? base : stay.originalPrice,
      priceNote: `Flash −${deal.discountPct}%`,
      flashDealEndsAt: deal.endsAt,
      flashDealDiscountPct: deal.discountPct,
      flashDealCurrency: deal.currency,
      currency: settings.currency || stay.currency,
    };
  }
  const notes: string[] = [];
  if (settings.discountsEnabled) {
    if (settings.weeklyDiscountPct > 0) notes.push(`${settings.weeklyDiscountPct}% weekly`);
    if (settings.monthlyDiscountPct > 0) notes.push(`${settings.monthlyDiscountPct}% monthly`);
  }
  return {
    ...stay,
    price: base,
    priceNote: notes.join(" · ") || undefined,
    flashDealEndsAt: undefined,
    flashDealDiscountPct: undefined,
    flashDealCurrency: undefined,
    currency: settings.currency || stay.currency,
  };
}

export type PublicStaysPage = {
  stays: Stay[];
  total: number;
  page: number;
  pageSize: number;
};

/** Approved listings from Postgres — paginated so search stays fast as inventory grows. */
export async function getPublicStaysFromStore(
  filters: ListingSearchFilters = {},
  pagination?: Partial<ListingPagination> | { page?: number; pageSize?: number }
): Promise<PublicStaysPage> {
  await seedListingsIfEmpty(getSeedListings());
  const { page, pageSize } = parseListingPagination({
    page: pagination?.page,
    perPage: pagination?.pageSize ?? PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE,
  });
  const result = await searchListingsPage(
    { ...filters, status: "approved" },
    { page, pageSize }
  );
  const approved = await attachPublicListingMeta(result.listings);
  const subscribedEvents = new Set(await listEventSubscribedHostIds());
  const subscribedDining = new Set(await listDiningSubscribedHostIds());
  const visible = approved.filter((listing) =>
    listingVisibleOnPublicCatalog(listing, subscribedEvents, subscribedDining)
  );
  const pricingById = await getListingPricingMap(visible.map((l) => l.id));
  const stays = visible.map((listing) =>
    stayWithPublishedRates(listing, pricingById.get(listing.id))
  );
  const hidden = approved.length - visible.length;
  return {
    stays,
    total: Math.max(0, result.total - hidden),
    page: result.page,
    pageSize: result.pageSize,
  };
}

export async function getPublicStayById(id: string): Promise<Stay | null> {
  const detail = await getApprovedListingDetail(id);
  return detail?.stay ?? null;
}

/** Approved listing + pricing for the public detail page (photos, rooms, copy). */
export type PublicListingSitemapEntry = {
  id: string;
  updatedAt?: string;
};

/** Approved, publicly visible listings for sitemap generation. */
export async function getPublicListingSitemapEntries(): Promise<PublicListingSitemapEntry[]> {
  await seedListingsIfEmpty(getSeedListings());
  const result = await searchListingsPage({ status: "approved" }, { unlimited: true });
  const subscribedEvents = new Set(await listEventSubscribedHostIds());
  const subscribedDining = new Set(await listDiningSubscribedHostIds());
  return result.listings
    .filter((listing) => listingVisibleOnPublicCatalog(listing, subscribedEvents, subscribedDining))
    .map((listing) => ({
      id: listing.id,
      updatedAt: listing.statusUpdatedAt ?? listing.submittedAt,
    }));
}

export async function getApprovedListingDetail(id: string): Promise<{
  stay: Stay;
  listing: SubmittedListing;
  pricing: ListingPricingSettings | null;
} | null> {
  try {
    await seedListingsIfEmpty(getSeedListings());
    const listing = await getListing(id);
    if (!listing || listing.status !== "approved") return null;
    if (isDirectoryListing(listing)) {
      const subscribedEvents = new Set(await listEventSubscribedHostIds());
      const subscribedDining = new Set(await listDiningSubscribedHostIds());
      if (!listingVisibleOnPublicCatalog(listing, subscribedEvents, subscribedDining)) {
        return null;
      }
    }
    const [withMeta] = await attachPublicListingMeta([listing]);
    const pricingById = await getListingPricingMap([listing.id]);
    const pricing = pricingById.get(listing.id) ?? null;
    return {
      stay: stayWithPublishedRates(withMeta, pricing ?? undefined),
      listing: withMeta,
      pricing,
    };
  } catch {
    return null;
  }
}
