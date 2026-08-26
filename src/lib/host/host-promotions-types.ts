export type ListingPromotionKind = "trending" | "featured";

export type ListingPromotionDurationDays = 7 | 14 | 30;

export interface ListingPromotionPackage {
  id: string;
  kind: ListingPromotionKind;
  durationDays: ListingPromotionDurationDays;
  priceAed: number;
  label: string;
  description: string;
  /** When false, hidden from host Promote checkout */
  enabled: boolean;
}

export interface ListingPromotion {
  id: string;
  listingId: string;
  hostId: string;
  kind: ListingPromotionKind;
  durationDays: ListingPromotionDurationDays;
  priceAed: number;
  currency: "AED";
  /** When payment was confirmed */
  purchasedAt: string;
  startsAt: string;
  endsAt: string;
  status: "pending" | "active" | "expired";
  /** Stripe session id or demo reference */
  paymentRef: string;
}

/** Admin-editable promote catalog + page copy */
export interface HostPromotionsSettings {
  /** Shown at top of Host → Promote */
  pageTitle: string;
  pageSubtitle: string;
  currency: "AED";
  /** Master switch — when false, hosts cannot buy placements */
  promotionsEnabled: boolean;
  packages: ListingPromotionPackage[];
}

export const DEFAULT_PROMOTION_PACKAGES: ListingPromotionPackage[] = [
  {
    id: "pkg-trending-7",
    kind: "trending",
    durationDays: 7,
    priceAed: 149,
    label: "Trending · 7 days",
    description: "Appear in homepage Trending Farm Stays near guests.",
    enabled: true,
  },
  {
    id: "pkg-trending-14",
    kind: "trending",
    durationDays: 14,
    priceAed: 249,
    label: "Trending · 14 days",
    description: "Two weeks in the Trending section for more discovery.",
    enabled: true,
  },
  {
    id: "pkg-trending-30",
    kind: "trending",
    durationDays: 30,
    priceAed: 399,
    label: "Trending · 30 days",
    description: "Full month of Trending placement.",
    enabled: true,
  },
  {
    id: "pkg-featured-7",
    kind: "featured",
    durationDays: 7,
    priceAed: 299,
    label: "Featured · 7 days",
    description: "Featured badge + pin to the top of search results.",
    enabled: true,
  },
  {
    id: "pkg-featured-14",
    kind: "featured",
    durationDays: 14,
    priceAed: 499,
    label: "Featured · 14 days",
    description: "Stay on top of listings for two weeks.",
    enabled: true,
  },
  {
    id: "pkg-featured-30",
    kind: "featured",
    durationDays: 30,
    priceAed: 799,
    label: "Featured · 30 days",
    description: "Maximum visibility for a full month.",
    enabled: true,
  },
];

export const DEFAULT_HOST_PROMOTIONS_SETTINGS: HostPromotionsSettings = {
  pageTitle: "Promote your stay",
  pageSubtitle:
    "Pay to appear in Trending Farm Stays or as a Featured listing at the top of search results. Both are paid placements.",
  currency: "AED",
  promotionsEnabled: true,
  packages: DEFAULT_PROMOTION_PACKAGES.map((p) => ({ ...p })),
};

/** @deprecated Use loadHostPromotionsSettings().packages — kept for call sites during migration */
export const PROMOTION_PACKAGES = DEFAULT_PROMOTION_PACKAGES;
