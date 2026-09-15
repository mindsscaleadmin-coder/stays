"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { ListingGalleryContent } from "@/components/listing/listing-gallery-content";
import { loadAllSubmissions, LISTINGS_SYNC_EVENT } from "@/lib/listings/submission-data";
import {
  submissionGallery,
  submissionGalleryPhotos,
  submissionToStay,
} from "@/lib/listings/submission-to-stay";
import type { SubmittedListing } from "@/lib/listings/submission-types";

export function SubmissionGalleryLoader({ id }: { id: string }) {
  const [listing, setListing] = useState<SubmittedListing | null | undefined>(undefined);

  useEffect(() => {
    function load() {
      setListing(loadAllSubmissions().find((l) => l.id === id) ?? null);
    }
    load();
    window.addEventListener(LISTINGS_SYNC_EVENT, load);
    return () => window.removeEventListener(LISTINGS_SYNC_EVENT, load);
  }, [id]);

  if (listing === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-white px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Gallery not found</h1>
        <Link href="/listings" className="text-green-700 font-semibold text-sm hover:underline">
          Browse stays
        </Link>
      </div>
    );
  }

  const images = submissionGallery(listing);
  const videoTourUrl = listing.venueDetails?.videoTourUrl?.trim() ?? "";
  if (images.length === 0 && !videoTourUrl) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-white px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">No photos yet</h1>
        <Link href={`/listing/${id}`} className="text-green-700 font-semibold text-sm hover:underline">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <ListingGalleryContent
      stay={submissionToStay(listing)}
      photos={submissionGalleryPhotos(listing)}
      videoTourUrl={videoTourUrl || undefined}
    />
  );
}
