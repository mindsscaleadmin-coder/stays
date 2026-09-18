import type { Stay } from "@/lib/mock/data";
import { buildListingJsonLd } from "@/lib/seo/listing-json-ld";
import { getSiteUrl } from "@/lib/seo/site";
import type { SubmittedListing } from "@/lib/listings/submission-types";

export function ListingJsonLd({
  listing,
  stay,
}: {
  listing: SubmittedListing;
  stay: Stay;
}) {
  const schema = buildListingJsonLd(listing, stay, getSiteUrl());
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
