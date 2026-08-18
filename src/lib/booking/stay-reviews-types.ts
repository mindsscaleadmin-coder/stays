export type StayReviewStatus = "pending" | "published" | "removed";

export type StayReview = {
  id: string;
  bookingId: string;
  listingId: string;
  authorId: string;
  authorName: string;
  property: string;
  rating: number;
  comment: string;
  status: StayReviewStatus;
  createdAt: string;
};

export type ReviewEligibility = {
  eligible: boolean;
  reason?: string;
  bookingId: string;
  listingId: string;
  property: string;
};
