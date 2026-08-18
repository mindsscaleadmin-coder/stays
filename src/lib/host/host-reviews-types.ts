export interface HostReviewCategory {
  id: string;
  label: string;
  score: number;
}

export type ReviewModerationStatus = "visible" | "removed" | "flagged";

export interface HostGuestReview {
  id: string;
  guestName: string;
  property: string;
  rating: number;
  date: string;
  text: string;
  categories: HostReviewCategory[];
  hostResponse?: string;
  respondedAt?: string;
  moderationStatus?: ReviewModerationStatus;
  removedReason?: string;
  removedAt?: string;
}

export interface HostResponseTemplate {
  id: string;
  title: string;
  body: string;
}

export interface HostReviewsData {
  hostId: string;
  overallRating: number;
  reviewCount: number;
  categoryBreakdown: HostReviewCategory[];
  reviews: HostGuestReview[];
  templates: HostResponseTemplate[];
}
