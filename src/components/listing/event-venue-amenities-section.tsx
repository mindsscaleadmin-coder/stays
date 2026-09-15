"use client";

import { useMemo, type ReactNode } from "react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  filterListingLevelVenueAmenities,
  groupVenueAmenities,
} from "@/lib/listings/group-venue-amenities";
import type { VenueDetails } from "@/lib/listings/venue-details-types";

function AmenitySection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-gray-200 py-4 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start sm:gap-6">
      <h3 className="font-display text-sm font-semibold text-gray-900">{label}</h3>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EventVenueAmenitiesSection({
  amenities,
  venueDetails,
  multiRate = false,
}: {
  amenities: string[];
  venueDetails?: VenueDetails;
  /** When true, hide per-space filters — show only common listing-level filters. */
  multiRate?: boolean;
}) {
  const { data: taxonomy } = useAdminTaxonomy();

  const listingAmenities = useMemo(
    () => filterListingLevelVenueAmenities(amenities, taxonomy, multiRate),
    [amenities, taxonomy, multiRate]
  );

  const allGroups = useMemo(
    () => groupVenueAmenities(listingAmenities, taxonomy),
    [listingAmenities, taxonomy]
  );

  const specs = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (venueDetails?.maxGuests != null && venueDetails.maxGuests > 0) {
      rows.push({
        label: "Max guests",
        value: venueDetails.maxGuests.toLocaleString(),
      });
    }
    if (venueDetails?.hallSizeSqFt != null && venueDetails.hallSizeSqFt > 0) {
      rows.push({
        label: "Hall size",
        value: `${venueDetails.hallSizeSqFt.toLocaleString()} sq ft`,
      });
    }
    if (venueDetails?.parkingCapacity?.trim()) {
      rows.push({
        label: "Parking",
        value: venueDetails.parkingCapacity.trim(),
      });
    }
    if (venueDetails?.ceilingHeightFt != null && venueDetails.ceilingHeightFt > 0) {
      rows.push({
        label: "Ceiling height",
        value: `${venueDetails.ceilingHeightFt} ft`,
      });
    }
    return rows;
  }, [venueDetails]);

  const totalCount = listingAmenities.length;
  const hasGroups = allGroups.length > 0;
  const showVenueSpecs = specs.length > 0 && !multiRate;

  if (totalCount === 0 && !showVenueSpecs) {
    return (
      <section id="event-amenities" className="mt-7 scroll-mt-28">
        <h2 className="font-display text-lg font-extrabold text-gray-950">Venue amenities &amp; services</h2>
        <p className="mt-2 text-sm text-gray-500">No amenities listed yet.</p>
      </section>
    );
  }

  return (
    <section id="event-amenities" className="mt-7 scroll-mt-28">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-display text-lg font-extrabold text-gray-950">Venue amenities &amp; services</h2>
        {totalCount > 0 ? (
          <span className="text-xs font-medium text-gray-500">{totalCount} included</span>
        ) : null}
      </div>

      {showVenueSpecs ? (
        <AmenitySection label="Venue details">
          <p className="text-sm leading-relaxed text-gray-800">
            {specs.map((spec) => `${spec.label}: ${spec.value}`).join(" · ")}
          </p>
        </AmenitySection>
      ) : null}

      {hasGroups ? (
        <div>
          {allGroups.map((group) => (
            <AmenitySection key={group.id} label={group.label}>
              <p className="text-sm leading-relaxed text-gray-800">
                {group.items.join(" · ")}
              </p>
            </AmenitySection>
          ))}
        </div>
      ) : null}
    </section>
  );
}
