import type { Stay } from "@/lib/mock/data";
import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import { submissionGallery } from "@/lib/listings/submission-to-stay";
import type { SubmittedListing } from "@/lib/listings/submission-types";
import { LAUNCH_CURRENCY } from "@/lib/tax/launch-market";
import { SITE_NAME } from "./site";
import { listingCanonicalPath, resolveListingSeoCopy } from "./listing-metadata";

type JsonLd = Record<string, unknown>;

export function buildListingJsonLd(
  listing: SubmittedListing,
  stay: Stay,
  siteUrl: string
): JsonLd {
  const { title, description } = resolveListingSeoCopy(listing, stay);
  const images = submissionGallery(listing);
  const url = `${siteUrl.replace(/\/$/, "")}${listingCanonicalPath(listing)}`;
  const address = {
    "@type": "PostalAddress",
    addressLocality: listing.city || undefined,
    addressRegion: listing.state || undefined,
    addressCountry: listing.country || undefined,
  };

  const base: JsonLd = {
    "@context": "https://schema.org",
    name: title,
    description,
    url,
    image: images.length > 0 ? images : undefined,
    address,
  };

  if (isDiningListing(listing)) {
    return {
      ...base,
      "@type": "Restaurant",
      priceRange: listing.diningDetails?.priceLevel
        ? "$".repeat(listing.diningDetails.priceLevel)
        : undefined,
      telephone: listing.diningDetails?.contactPhone,
    };
  }

  if (isEventListing(listing)) {
    return {
      ...base,
      "@type": "EventVenue",
      maximumAttendeeCapacity: listing.venueDetails?.maxGuests,
    };
  }

  if (listing.type === "experience") {
    return {
      ...base,
      "@type": "TouristTrip",
      touristType: listing.category || "Experience",
      provider: {
        "@type": "Organization",
        name: listing.hostName || SITE_NAME,
      },
    };
  }

  return {
    ...base,
    "@type": "LodgingBusiness",
    priceRange: stay.price > 0 ? `${stay.currency || LAUNCH_CURRENCY} ${stay.price}` : undefined,
    aggregateRating:
      stay.reviews > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: stay.rating,
            reviewCount: stay.reviews,
          }
        : undefined,
  };
}
