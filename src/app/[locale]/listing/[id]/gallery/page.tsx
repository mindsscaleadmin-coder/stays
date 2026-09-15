import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ListingGalleryContent } from "@/components/listing/listing-gallery-content";
import { SubmissionGalleryLoader } from "@/components/listing/submission-gallery-loader";
import { getPublicStayById } from "@/lib/listings/public-listings-server";
import { getListing } from "@/lib/server/listings-repo";
import { submissionGalleryPhotos } from "@/lib/listings/submission-to-stay";

export const revalidate = 60;

function GalleryFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white/60">
      Loading gallery…
    </div>
  );
}

export default async function ListingGalleryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const stay = await getPublicStayById(id);
  const listing = stay ? await getListing(id) : null;
  if (stay && listing) {
    return (
      <Suspense fallback={<GalleryFallback />}>
        <ListingGalleryContent
          stay={stay}
          photos={submissionGalleryPhotos(listing)}
          videoTourUrl={listing.venueDetails?.videoTourUrl}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<GalleryFallback />}>
      <SubmissionGalleryLoader id={id} />
    </Suspense>
  );
}
