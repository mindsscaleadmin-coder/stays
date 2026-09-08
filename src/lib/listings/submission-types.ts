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
  itinerary?: { step: number; title: string; description?: string }[];
  meetingPoint?: string;
  requirements?: string;
  licenseNumber?: string;
  groupSizeMin?: number;
}

/** Fields a host can change when editing an existing listing. */
export type UpdateListingInput = Omit<SubmitListingInput, "hostId" | "hostName" | "rooms">;

export type AddListingRoomInput = Omit<ListingRoom, "id">;
