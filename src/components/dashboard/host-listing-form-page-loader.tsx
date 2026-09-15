"use client";

import dynamic from "next/dynamic";

const HostListingFormPageClient = dynamic(
  () => import("./host-listing-form-page-client"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

export function HostListingFormPageLoader({ listingId }: { listingId?: string }) {
  return <HostListingFormPageClient listingId={listingId} />;
}
