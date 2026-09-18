import type { Metadata } from "next";
import type { Stay } from "@/lib/mock/data";
import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import { submissionGallery } from "@/lib/listings/submission-to-stay";
import type { SubmittedListing } from "@/lib/listings/submission-types";
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "./site";

function truncate(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function resolveListingSeoCopy(listing: SubmittedListing, stay: Stay) {
  const dining = listing.diningDetails;
  const seoTitle = dining?.seoTitle?.trim();
  const seoDescription = dining?.seoDescription?.trim();
  const seoKeywords = dining?.seoKeywords?.trim();

  const title =
    isDiningListing(listing) && seoTitle ? seoTitle : listing.title.trim() || stay.name;

  const description =
    isDiningListing(listing) && seoDescription
      ? seoDescription
      : listing.description?.trim()
        ? truncate(listing.description, 160)
        : `Discover ${title} on ${SITE_NAME}.`;

  return {
    title,
    description,
    keywords: seoKeywords ? seoKeywords.split(/,\s*/).filter(Boolean) : undefined,
  };
}

export function listingCanonicalPath(listing: SubmittedListing): string {
  return `/listing/${listing.id}`;
}

export function buildListingMetadata(listing: SubmittedListing, stay: Stay): Metadata {
  const { title, description, keywords } = resolveListingSeoCopy(listing, stay);
  const path = listingCanonicalPath(listing);
  const url = absoluteUrl(path);
  const images = submissionGallery(listing);
  const image = images[0];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildListingNotFoundMetadata(): Metadata {
  return {
    title: "Listing",
    description: DEFAULT_DESCRIPTION,
  };
}
