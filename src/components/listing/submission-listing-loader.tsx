"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveFeatureIcons, resolveHighlightLabels } from "@/lib/admin/listing-settings-data";
import { ListingDetailContent } from "@/components/listing/listing-detail-content";
import { HOST_PRICING_SYNC_EVENT, loadPricingSettings } from "@/lib/host/host-pricing-data";
import {
  loadAllSubmissions,
  loadMirroredSubmissions,
  isSharedListingsEnabled,
  LISTINGS_SYNC_EVENT,
} from "@/lib/listings/submission-data";
import {
  submissionGalleryPhotos,
  nightlyFromListing,
  submissionToStay,
} from "@/lib/listings/submission-to-stay";
import { readGuestPartyFromFilters } from "@/lib/listings/guest-capacity";
import type { SubmittedListing } from "@/lib/listings/submission-types";

export function SubmissionListingLoader({ id }: { id: string }) {
  const locale = useLocale();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<SubmittedListing | null | undefined>(undefined);
  const [pricingTick, setPricingTick] = useState(0);

  const propertyHighlights = useMemo(() => {
    if (!listing?.highlightIds) return undefined;
    return resolveHighlightLabels(listing.highlightIds, locale);
  }, [listing, locale]);

  const propertyFeatureIcons = useMemo(() => {
    if (!listing?.featureIconIds) return undefined;
    return resolveFeatureIcons(listing.featureIconIds, locale);
  }, [listing, locale]);

  useEffect(() => {
    function load() {
      const fromMirror = isSharedListingsEnabled()
        ? loadMirroredSubmissions().find((l) => l.id === id)
        : undefined;
      setListing(fromMirror ?? loadAllSubmissions().find((l) => l.id === id) ?? null);
      setPricingTick((n) => n + 1);
    }
    load();
    window.addEventListener(LISTINGS_SYNC_EVENT, load);
    window.addEventListener(HOST_PRICING_SYNC_EVENT, load);
    return () => {
      window.removeEventListener(LISTINGS_SYNC_EVENT, load);
      window.removeEventListener(HOST_PRICING_SYNC_EVENT, load);
    };
  }, [id]);

  if (listing === undefined || authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Listing not found</h1>
        <p className="text-gray-500 text-sm mb-4">
          This listing may have been removed or is unavailable.
        </p>
        <Link href="/search" className="text-green-700 font-semibold text-sm hover:underline">
          Browse stays
        </Link>
      </div>
    );
  }

  const isPreview = listing.status !== "approved";
  const canPreviewUnapproved =
    isAdmin || Boolean(user?.id && listing.hostId && user.id === listing.hostId);

  if (isPreview && !canPreviewUnapproved) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Listing not found</h1>
        <p className="text-gray-500 text-sm mb-4">
          This listing may have been removed or is unavailable.
        </p>
        <Link href="/search" className="text-green-700 font-semibold text-sm hover:underline">
          Browse stays
        </Link>
      </div>
    );
  }

  const pricing = loadPricingSettings(listing.id);
  void pricingTick;
  const stay = {
    ...submissionToStay(listing),
    price: pricing.basePrice > 0 ? pricing.basePrice : nightlyFromListing(listing),
  };
  const rooms = (listing.rooms ?? []).map((room) => {
    const stored = pricing.roomPrices.find((r) => r.roomId === room.id);
    return {
      id: room.id,
      name: room.name,
      desc: room.description,
      price: stored?.basePrice ?? room.price ?? pricing.basePrice,
      capacity: room.capacity,
      maxAdults: room.maxAdults,
      maxChildren: room.maxChildren,
      maxInfants: room.maxInfants,
      beds: room.beds,
      baths: room.baths,
      img: room.img,
    };
  });

  return (
    <>
      {isPreview && (
        <div className="bg-amber-500 text-white text-center py-2.5 px-4 text-sm font-medium">
          Not live — this listing is pending admin approval and is hidden from guests
        </div>
      )}
      <ListingDetailContent
        stay={stay}
        galleryPhotos={submissionGalleryPhotos(listing)}
        description={listing.description}
        propertyHighlights={propertyHighlights}
        propertyFeatureIcons={propertyFeatureIcons}
        farmType={listing.farmType}
        farmActivities={listing.farmActivities}
        livestockCrops={listing.livestockCrops}
        houseRules={listing.houseRules}
        mapEmbedUrl={listing.mapEmbedUrl || undefined}
        previewMode={isPreview}
        rooms={rooms}
        guestParty={readGuestPartyFromFilters(listing.customFilters, stay.guests)}
        amenities={[...(listing.amenities ?? []), ...(listing.advancedFilters ?? [])]}
        extraCharges={
          pricing.extraChargesEnabled ? pricing.extraCharges : []
        }
        extraChargesCurrency={pricing.currency}
        itinerary={listing.itinerary}
        meetingPoint={listing.meetingPoint}
        requirements={listing.requirements}
        licenseNumber={listing.licenseNumber}
        groupSizeMin={listing.groupSizeMin}
      />
    </>
  );
}
