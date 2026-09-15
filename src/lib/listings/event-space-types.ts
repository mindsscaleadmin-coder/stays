import type { VenueSpaceFilterGroup } from "@/lib/listings/resolve-venue-space-filters";
import type { VenueDetails } from "@/lib/listings/venue-details-types";

export interface EventSpace {
  id?: string;
  name: string;
  desc: string;
  price: number;
  capacity: number;
  img: string;
  /** All photos for this space (cover first). */
  images?: string[];
  /** Per-space venue filters (multi-rate listings only). */
  advancedFilterIds?: string[];
  /** Grouped venue-space filters for guest display (multi-rate only). */
  filterGroups?: VenueSpaceFilterGroup[];
  /** Per-space venue specs for guest display (multi-rate only). */
  venueDetails?: VenueDetails;
}
