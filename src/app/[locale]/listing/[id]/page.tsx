import { setRequestLocale } from "next-intl/server";
import { ListingDetailContent } from "@/components/listing/listing-detail-content";
import { SubmissionListingLoader } from "@/components/listing/submission-listing-loader";
import {
  resolveFeatureIcons,
  resolveHighlightLabels,
} from "@/lib/admin/listing-settings-data";
import { getApprovedListingDetail } from "@/lib/listings/public-listings-server";
import {
  LISTING_PLACEHOLDER_IMG,
  submissionGalleryPhotos,
} from "@/lib/listings/submission-to-stay";
import { readGuestPartyFromFilters } from "@/lib/listings/guest-capacity";

export const revalidate = 60;

export default async function ListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const detail = await getApprovedListingDetail(id);
  if (!detail) {
    return <SubmissionListingLoader id={id} />;
  }

  const { stay, listing, pricing } = detail;
  const rooms = (listing.rooms ?? []).map((room) => {
    const stored = pricing?.roomPrices.find((r) => r.roomId === room.id);
    return {
      id: room.id,
      name: room.name,
      desc: room.description,
      price: stored?.basePrice ?? room.price ?? pricing?.basePrice ?? stay.price,
      capacity: room.capacity,
      maxAdults: room.maxAdults,
      maxChildren: room.maxChildren,
      maxInfants: room.maxInfants,
      beds: room.beds,
      baths: room.baths,
      img: room.img || stay.img || LISTING_PLACEHOLDER_IMG,
      advancedFilterIds: room.advancedFilterIds,
      venueDetails: room.venueDetails,
    };
  });

  return (
    <ListingDetailContent
      stay={stay}
      galleryPhotos={submissionGalleryPhotos(listing)}
      description={listing.description}
      propertyHighlights={resolveHighlightLabels(listing.highlightIds ?? [], locale)}
      propertyFeatureIcons={resolveFeatureIcons(listing.featureIconIds ?? [], locale)}
      farmType={listing.farmType}
      farmActivities={listing.farmActivities}
      livestockCrops={listing.livestockCrops}
      houseRules={listing.houseRules}
      mapEmbedUrl={listing.mapEmbedUrl || undefined}
      rooms={rooms}
      guestParty={readGuestPartyFromFilters(listing.customFilters, stay.guests)}
      amenities={[...(listing.amenities ?? []), ...(listing.advancedFilters ?? [])]}
      advancedFilters={listing.advancedFilters ?? []}
      venueDetails={listing.venueDetails}
      diningDetails={listing.diningDetails}
      extraCharges={pricing?.extraChargesEnabled ? pricing.extraCharges : []}
      extraChargesCurrency={pricing?.currency}
      itinerary={listing.itinerary}
      meetingPoint={listing.meetingPoint}
      requirements={listing.requirements}
      licenseNumber={listing.licenseNumber}
      groupSizeMin={listing.groupSizeMin}
    />
  );
}
