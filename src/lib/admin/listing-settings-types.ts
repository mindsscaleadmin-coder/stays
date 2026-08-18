export interface ListingHighlight {
  id: string;
  label: string;
  enabled: boolean;
}

export interface ListingFeatureIcon {
  id: string;
  label: string;
  iconKey: string;
  enabled: boolean;
}

export interface ListingSettings {
  highlights: ListingHighlight[];
  featureIcons: ListingFeatureIcon[];
  ratingCategories: ListingRatingCategory[];
  guestReviews: ListingGuestReview[];
}

export interface ListingRatingCategory {
  id: string;
  label: string;
  score: number;
  enabled: boolean;
}

export interface ListingGuestReview {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  avatar: string;
  date: string;
  helpful: number;
  enabled: boolean;
}

export type ListingHighlightInput = Omit<ListingHighlight, "id">;
export type ListingFeatureIconInput = Omit<ListingFeatureIcon, "id">;
export type ListingRatingCategoryInput = Omit<ListingRatingCategory, "id">;
export type ListingGuestReviewInput = Omit<ListingGuestReview, "id">;

export interface ResolvedListingFeatureIcon {
  id: string;
  label: string;
  iconKey: string;
}
