import type { Stay } from "@/lib/mock/data";
import { getSeedListings } from "./listing-seeds";
import {
  getListing,
  searchListings,
  seedListingsIfEmpty,
} from "@/lib/server/listings-repo";
import { getListingPricingMap } from "@/lib/server/listing-pricing-repo";
import { getActiveFlashDeal } from "@/lib/host/flash-deal-utils";
import { attachPublicListingMeta } from "./attach-public-listing-meta";
import { submissionToStay } from "./submission-to-stay";
import type { SubmittedListing } from "./submission-types";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import type { ListingSearchFilters } from "./match-listing";

function stayWithPublishedRates(
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

/** Approved listings from Postgres — the same store checkout and the host calendar use. */
export async function getPublicStaysFromStore(
  filters: ListingSearchFilters = {}
): Promise<Stay[]> {
  await seedListingsIfEmpty(getSeedListings());
  const approved = await attachPublicListingMeta(
    await searchListings({ ...filters, status: "approved" })
  );
  const pricingById = await getListingPricingMap(approved.map((l) => l.id));
  return approved.map((listing) => stayWithPublishedRates(listing, pricingById.get(listing.id)));
}

export async function getPublicStayById(id: string): Promise<Stay | null> {
  try {
    await seedListingsIfEmpty(getSeedListings());
    const listing = await getListing(id);
    if (!listing || listing.status !== "approved") return null;
    const [withMeta] = await attachPublicListingMeta([listing]);
    const pricingById = await getListingPricingMap([listing.id]);
    return stayWithPublishedRates(withMeta, pricingById.get(listing.id));
  } catch {
    return null;
  }
}
