"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import { HostListingPricingSection } from "@/components/dashboard/host-listing-pricing-section";

export function HostPricingContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, ready: listingsReady } = useListingSubmissions({ load: true });

  const submissions = useMemo(
    () => filterHostListings(all, hostId ?? "", hostName),
    [all, hostId, hostName]
  );

  const listingOptions = useMemo(
    () =>
      submissions.map((l) => ({
        id: l.id,
        title: l.title,
        rooms: l.rooms ?? [],
      })),
    [submissions]
  );

  const fromListing = searchParams.get("from") === "listing";
  const initialListingId =
    searchParams.get("listing") ?? listingOptions[0]?.id ?? "";
  const initialRoomId = searchParams.get("room") ?? "";

  const [listingId, setListingId] = useState(initialListingId);

  const appliedUrlListingRef = useRef<string | null>(null);
  const listingSelectionValidRef = useRef(false);

  useEffect(() => {
    if (!listingsReady) return;
    const fromUrl = searchParams.get("listing");

    if (
      fromUrl &&
      appliedUrlListingRef.current !== fromUrl &&
      listingOptions.some((l) => l.id === fromUrl)
    ) {
      appliedUrlListingRef.current = fromUrl;
      listingSelectionValidRef.current = true;
      setListingId(fromUrl);
      return;
    }

    if (listingOptions.some((l) => l.id === listingId)) {
      listingSelectionValidRef.current = true;
      return;
    }

    if (!listingSelectionValidRef.current && listingOptions[0]) {
      setListingId(listingOptions[0].id);
    }
  }, [listingId, listingOptions, listingsReady, searchParams]);

  const initialMessage = fromListing
    ? "Listing saved. Pricing was filled from the listing country and a similar property when available."
    : "";

  if (!listingsReady) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  if (listingOptions.length === 0) {
    return (
      <HostDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-2">No listings yet</h2>
          <p className="text-sm text-gray-500 mb-4">
            Add a property first. Rates, discounts, and extras are saved on that listing.
          </p>
          <Link
            href="/host/new-listing"
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add Property
          </Link>
        </div>
      </HostDashboardShell>
    );
  }

  if (!listingId) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <HostListingPricingSection
        listingId={listingId}
        listingOptions={listingOptions}
        onListingIdChange={setListingId}
        fromListing={fromListing}
        initialMessage={initialMessage}
        initialRoomId={initialRoomId}
      />
    </HostDashboardShell>
  );
}
