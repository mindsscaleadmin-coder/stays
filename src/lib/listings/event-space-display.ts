import type { VenueSpaceFilterGroup } from "@/lib/listings/resolve-venue-space-filters";
import {
  VENUE_PRICE_UNIT_OPTIONS,
  type VenueDetails,
} from "@/lib/listings/venue-details-types";

export type VenueSpaceFeatureRow = {
  label: string;
  value: string;
};

export type VenueCapacityLayout = {
  id: "standing" | "dining" | "theatre" | "cabaret" | "classroom";
  label: string;
  value: number;
};

export function buildVenueCapacityLayouts(venueDetails?: VenueDetails): VenueCapacityLayout[] {
  if (!venueDetails) return [];

  const layouts: VenueCapacityLayout[] = [];

  if (venueDetails.standingCapacity != null && venueDetails.standingCapacity > 0) {
    layouts.push({
      id: "standing",
      label: "Standing",
      value: venueDetails.standingCapacity,
    });
  }
  if (venueDetails.seatedCapacity != null && venueDetails.seatedCapacity > 0) {
    layouts.push({
      id: "dining",
      label: "Dining",
      value: venueDetails.seatedCapacity,
    });
  }
  if (venueDetails.theatreCapacity != null && venueDetails.theatreCapacity > 0) {
    layouts.push({
      id: "theatre",
      label: "Theatre",
      value: venueDetails.theatreCapacity,
    });
  }
  if (venueDetails.cabaretCapacity != null && venueDetails.cabaretCapacity > 0) {
    layouts.push({
      id: "cabaret",
      label: "Cabaret",
      value: venueDetails.cabaretCapacity,
    });
  }
  if (venueDetails.classroomCapacity != null && venueDetails.classroomCapacity > 0) {
    layouts.push({
      id: "classroom",
      label: "Classroom",
      value: venueDetails.classroomCapacity,
    });
  }

  if (
    layouts.length === 0 &&
    venueDetails.maxGuests != null &&
    venueDetails.maxGuests > 0
  ) {
    layouts.push({
      id: "standing",
      label: "Standing",
      value: venueDetails.maxGuests,
    });
  }

  return layouts;
}

export function buildVenueSpaceFeatureRows(
  venueDetails?: VenueDetails,
  money?: (amount: number) => string
): VenueSpaceFeatureRow[] {
  if (!venueDetails) return [];

  const rows: VenueSpaceFeatureRow[] = [];

  if (venueDetails.hallSizeSqFt != null && venueDetails.hallSizeSqFt > 0) {
    rows.push({
      label: "Floor covering",
      value: `${venueDetails.hallSizeSqFt.toLocaleString()} sq ft`,
    });
  }
  if (venueDetails.ceilingHeightFt != null && venueDetails.ceilingHeightFt > 0) {
    rows.push({
      label: "Ceiling height",
      value: `${venueDetails.ceilingHeightFt} ft`,
    });
  }
  if (venueDetails.parkingCapacity?.trim()) {
    rows.push({ label: "Parking", value: venueDetails.parkingCapacity.trim() });
  }
  if (venueDetails.minimumBookingDuration?.trim()) {
    rows.push({
      label: "Minimum booking",
      value: venueDetails.minimumBookingDuration.trim(),
    });
  }
  const priceUnit = VENUE_PRICE_UNIT_OPTIONS.find(
    (option) => option.value === venueDetails.priceUnit
  )?.label;
  if (priceUnit) {
    rows.push({ label: "Price unit", value: priceUnit });
  }
  if (venueDetails.securityDeposit != null && venueDetails.securityDeposit > 0 && money) {
    rows.push({
      label: "Security deposit",
      value: money(venueDetails.securityDeposit),
    });
  }

  return rows;
}

export function primarySpaceTypeLabel(filterGroups: VenueSpaceFilterGroup[]): string | null {
  const indoorOutdoor = filterGroups.find((group) => /indoor/i.test(group.label));
  if (indoorOutdoor?.names[0]) return indoorOutdoor.names[0];

  const suitableFor = filterGroups.find((group) => /suitable/i.test(group.label));
  if (suitableFor?.names[0]) return suitableFor.names[0];

  return filterGroups[0]?.names[0] ?? null;
}

export function resolveEventGuestCapacityRange(
  spaces: { capacity: number }[],
  options?: { stayGuests?: number; venueMaxGuests?: number }
): { min: number; max: number } | null {
  const spaceCaps = spaces.map((space) => space.capacity).filter((capacity) => capacity > 0);
  const fromSpacesMin = spaceCaps.length > 0 ? Math.min(...spaceCaps) : 0;
  const fromSpacesMax = spaceCaps.length > 0 ? Math.max(...spaceCaps) : 0;
  const venueMax = options?.venueMaxGuests ?? 0;
  const stayGuests = options?.stayGuests ?? 0;

  const max = Math.max(fromSpacesMax, venueMax, stayGuests);
  if (max <= 0) return null;

  const minCandidate = fromSpacesMin > 0 ? fromSpacesMin : stayGuests > 0 ? stayGuests : max;
  const min = Math.min(minCandidate, max);

  return { min, max };
}

export function formatEventGuestCapacityLabel(range: { min: number; max: number } | null): string {
  if (!range) return "";
  if (range.min === range.max) return `Up to ${range.max} guests`;
  return `${range.min}–${range.max} guests`;
}

export function formatEventGuestCapacityStat(range: { min: number; max: number } | null): string {
  if (!range) return "—";
  if (range.min === range.max) return String(range.max);
  return `${range.min}–${range.max}`;
}
