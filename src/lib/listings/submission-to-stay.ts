import type { Stay } from "@/lib/mock/data";
import { currencyForCountryName } from "@/lib/currency";
import { payingGuestsCapacity, readGuestPartyFromFilters } from "./guest-capacity";
import type { SubmittedListing } from "./submission-types";

export const LISTING_PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";
const DEFAULT_IMG = LISTING_PLACEHOLDER_IMG;

function parseCount(label: string, value: string, fallback: number): number {
  const match = value.match(/\d+/);
  if (match) return Number(match[0]);
  const fromLabel = label.match(/\d+/);
  if (fromLabel) return Number(fromLabel[0]);
  return fallback;
}

export function nightlyFromListing(listing: SubmittedListing): number {
  if (listing.pricePerNight != null && listing.pricePerNight > 0) {
    return listing.pricePerNight;
  }
  const roomPrices = (listing.rooms ?? [])
    .map((r) => r.price)
    .filter((price) => price > 0);
  if (roomPrices.length > 0) return Math.min(...roomPrices);
  return 0;
}

export function submissionToStay(listing: SubmittedListing): Stay {
  const bedroomsFilter = listing.customFilters.find((f) => /bedroom/i.test(f.label));
  const bedsOnlyFilter = listing.customFilters.find((f) => /^beds?$/i.test(f.label.trim()));
  const bathsFilter = listing.customFilters.find((f) => /bath/i.test(f.label));

  const beds = bedroomsFilter
    ? parseCount(bedroomsFilter.label, bedroomsFilter.value, 2)
    : bedsOnlyFilter
      ? parseCount(bedsOnlyFilter.label, bedsOnlyFilter.value, 2)
      : 2;
  const baths = bathsFilter
    ? parseCount(bathsFilter.label, bathsFilter.value, 1)
    : 1;

  const type: Stay["type"] =
    listing.type === "homestay"
      ? "homestay"
      : listing.type === "venue"
        ? "venue"
        : listing.type === "experience"
          ? "experience"
          : "farmstay";

  const basePrice = nightlyFromListing(listing);
  const flashPct = listing.flashDealDiscountPct ?? 0;
  const flashEnds = listing.flashDealEndsAt
    ? new Date(listing.flashDealEndsAt).getTime()
    : NaN;
  const flashLive =
    flashPct > 0 && !Number.isNaN(flashEnds) && flashEnds > Date.now();
  const dealPrice = flashLive ? Math.round(basePrice * (1 - Math.min(100, flashPct) / 100)) : basePrice;

  const party = readGuestPartyFromFilters(listing.customFilters, Math.max(beds * 2, 2));
  const guestCapacity = payingGuestsCapacity(party);

  return {
    id: listing.id,
    propertyReference: listing.propertyReference,
    hostId: listing.hostId,
    name: listing.title,
    location: [listing.city, listing.district, listing.state, listing.country]
      .filter((part, index, parts) => part && parts.indexOf(part) === index)
      .join(", "),
    price: dealPrice,
    rating: listing.guestReviewCount ? listing.guestRating ?? 0 : 0,
    reviews: listing.guestReviewCount ?? 0,
    guests: guestCapacity,
    beds,
    baths,
    badge: listing.featured
      ? "Featured"
      : listing.trending
        ? "Trending"
        : listing.status === "approved"
          ? "Live"
          : "Preview",
    badgeColor: listing.featured
      ? "bg-green-600"
      : listing.trending
        ? "bg-amber-500"
        : listing.status === "approved"
          ? "bg-green-600"
          : "bg-amber-500",
    img: listing.photoUrls[0] ?? DEFAULT_IMG,
    category: listing.category || listing.subcategory,
    subcategory: listing.subcategory,
    type,
    parentCategory: listing.parentCategory,
    photoCount: Math.max(listing.photoUrls?.length ?? listing.photoCount ?? 1, 1),
    postedAt: listing.submittedAt,
    originalPrice: flashLive && basePrice > dealPrice ? basePrice : undefined,
    priceNote: flashLive ? `Flash −${Math.min(100, flashPct)}%` : undefined,
    flashDealEndsAt: flashLive ? listing.flashDealEndsAt ?? undefined : undefined,
    flashDealDiscountPct: flashLive ? Math.min(100, flashPct) : undefined,
    flashDealCurrency: flashLive ? listing.flashDealCurrency : undefined,
    currency: listing.flashDealCurrency || currencyForCountryName(listing.country),
    instantBook: true,
    amenities:
      (() => {
        const merged = [
          ...(listing.amenities ?? []),
          ...(listing.advancedFilters ?? []),
        ];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const item of merged) {
          const label = item.trim();
          if (!label) continue;
          const key = label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(label);
        }
        return out.length > 0
          ? out
          : ["Free WiFi", "BBQ Area", "Farm Activities"];
      })(),
  };
}

export function submissionGallery(listing: SubmittedListing): string[] {
  if (listing.photoUrls.length > 0) return listing.photoUrls;
  return [DEFAULT_IMG];
}

export interface GalleryPhoto {
  src: string;
  tag?: string;
}

/** Photos with optional tags from host listing (aligned by index). */
export function submissionGalleryPhotos(listing: SubmittedListing): GalleryPhoto[] {
  const urls = submissionGallery(listing);
  const tags = listing.photoTags ?? [];
  return urls.map((src, index) => ({
    src,
    tag: tags[index]?.trim() || undefined,
  }));
}

