import type { DiningDetails } from "./dining-details-types";
import type { VenueDetails } from "./venue-details-types";

export type ListingReviewStatus = "pending" | "approved" | "rejected" | "unpublished";

export interface HouseRule {
  title: string;
  description: string;
}

export interface ListingRoom {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Paying guests (adults + children). Infants are separate. */
  capacity: number;
  /** Max adults allowed (defaults derived from capacity when omitted). */
  maxAdults?: number;
  /** Max children allowed. */
  maxChildren?: number;
  /** Max infants allowed (do not count toward capacity). */
  maxInfants?: number;
  beds: number;
  baths: number;
  img: string;
  /** Taxonomy room-type id, or "custom". */
  typeId?: string;
  /** Category label (Entire place, Cottage, …). */
  typeName?: string;
  /** Event venue space filters (suitable for, amenities, facilities, etc.). */
  advancedFilterIds?: string[];
  /** Per-space capacity, size, and pricing terms (multi-rate event venues). */
  venueDetails?: VenueDetails;
}

export interface ListingFilterValues {
  countryId: string;
  stateId: string;
  districtId: string;
  cityId: string;
  parentId: string;
  categoryId: string;
  subcategoryId: string;
  customSelections: Record<string, string>;
  advancedIds: string[];
  highlightIds: string[];
  featureIconIds: string[];
}

export const EMPTY_LISTING_FILTERS: ListingFilterValues = {
  countryId: "",
  stateId: "",
  districtId: "",
  cityId: "",
  parentId: "",
  categoryId: "",
  subcategoryId: "",
  customSelections: {},
  advancedIds: [],
  highlightIds: [],
  featureIconIds: [],
};

export interface SubmittedListing {
  id: string;
  propertyReference?: string;
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  status: ListingReviewStatus;
  submittedAt: string;
  statusUpdatedAt?: string;
  /** Admin-curated homepage / search prominence */
  featured?: boolean;
  /** Admin flagged for follow-up review */
  flaggedForReview?: boolean;
  /** Reason recorded when admin unpublishes a live listing */
  unpublishReason?: string;
  country: string;
  state: string;
  district: string;
  parentCategory: string;
  category: string;
  subcategory: string;
  type: string;
  city: string;
  customFilters: { label: string; value: string }[];
  advancedFilters: string[];
  photoUrls: string[];
  /** Optional tags aligned with photoUrls by index */
  photoTags?: string[];
  photoCount: number;
  highlightIds?: string[];
  featureIconIds?: string[];
  amenities?: string[];
  farmType?: string;
  farmActivities?: string[];
  livestockCrops?: string;
  houseRules?: HouseRule[];
  /** Platform cancellation policy option selected by host */
  cancellationPolicyId?: string;
  rooms?: ListingRoom[];
  /** Nightly rate from Listing.pricePerNight / host Pricing (base). */
  pricePerNight?: number | null;
  /** Published guest reviews — attached from Prisma Review rows. */
  guestRating?: number;
  guestReviewCount?: number;
  /** Active paid Trending promotion. */
  trending?: boolean;
  /** Live flash deal attached from ListingPricing (cleared when off or expired). */
  flashDealEndsAt?: string | null;
  flashDealDiscountPct?: number;
  flashDealCurrency?: string;
  /** Google Maps / OSM embed URL for the listing location section */
  mapEmbedUrl?: string;
  /** Optional travel-time hints shown on the location section (e.g. Airport — 45 mins). */
  nearbyPlaces?: { label: string; duration: string }[];
  /** Experience listings — sequenced activity steps */
  itinerary?: { step: number; title: string; description?: string }[];
  /** Experience — where guests meet / pickup details */
  meetingPoint?: string;
  /** Experience — safety, age, clothing, liability notes */
  requirements?: string;
  /** Experience — tourism license / certification number */
  licenseNumber?: string;
  /** Experience — minimum group size (max uses listing/session capacity) */
  groupSizeMin?: number;
  /** Event venue — capacity, pricing, rules, and media (optional) */
  venueDetails?: VenueDetails;
  /** Dining listings — hours, menu, price level, and policies */
  diningDetails?: DiningDetails;
  /** Property safety compliance checklist & reminders verified by host */
  safetyChecklist?: ListingSafetyItem[];
}

export interface ListingSafetyItem {
  id: string;
  question: string;
  reminder: string;
  checked: boolean;
  label?: string;
  description?: string;
}

export interface SubmitListingInput {
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  country: string;
  state: string;
  district: string;
  parentCategory: string;
  category: string;
  subcategory: string;
  type: string;
  city: string;
  customFilters: { label: string; value: string }[];
  advancedFilters: string[];
  photoUrls: string[];
  photoTags?: string[];
  photoCount: number;
  highlightIds?: string[];
  featureIconIds?: string[];
  amenities?: string[];
  farmType?: string;
  farmActivities?: string[];
  livestockCrops?: string;
  houseRules?: HouseRule[];
  cancellationPolicyId?: string;
  rooms?: ListingRoom[];
  mapEmbedUrl?: string;
  nearbyPlaces?: { label: string; duration: string }[];
  itinerary?: { step: number; title: string; description?: string }[];
  meetingPoint?: string;
  requirements?: string;
  licenseNumber?: string;
  groupSizeMin?: number;
  venueDetails?: VenueDetails;
  diningDetails?: DiningDetails;
  safetyChecklist?: ListingSafetyItem[];
}

/** Fields a host can change when editing an existing listing. */
export type UpdateListingInput = Omit<SubmitListingInput, "hostId" | "hostName">;

export type AddListingRoomInput = Omit<ListingRoom, "id">;
