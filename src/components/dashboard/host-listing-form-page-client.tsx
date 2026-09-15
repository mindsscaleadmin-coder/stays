"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { HostListingFormUrlSync } from "./host-listing-form-url-sync";

export default function HostListingFormPageClient({ listingId }: { listingId?: string }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-700" />
        </div>
      }
    >
      <HostListingFormUrlSync listingId={listingId} />
    </Suspense>
  );
}
