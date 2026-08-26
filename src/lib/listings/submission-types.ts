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
  capacity: number;
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
}

/** Fields a host can change when editing an existing listing. */
export type UpdateListingInput = Omit<SubmitListingInput, "hostId" | "hostName" | "rooms">;

export type AddListingRoomInput = Omit<ListingRoom, "id">;
