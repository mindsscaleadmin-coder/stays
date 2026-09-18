export type ListingPromotionKind = "trending" | "featured";

export type ListingPromotionDurationDays = 7 | 14 | 30;

export type PromotionCurrency = "INR" | "AED";

export interface ListingPromotionPackage {
  id: string;
  kind: ListingPromotionKind;
  durationDays: ListingPromotionDurationDays;
  /** Price in platform currency (INR for India launch). */
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
  currency: PromotionCurrency;
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
  currency: PromotionCurrency;
  /** Master switch — when false, hosts cannot buy placements */
  promotionsEnabled: boolean;
  packages: ListingPromotionPackage[];
}

export const DEFAULT_PROMOTION_PACKAGES: ListingPromotionPackage[] = [
  {
    id: "pkg-trending-7",
    kind: "trending",
    durationDays: 7,
    priceAed: 999,
    label: "Trending · 7 days",
    description: "Appear in homepage Trending Farm Stays near guests.",
    enabled: true,
  },
  {
    id: "pkg-trending-14",
    kind: "trending",
    durationDays: 14,
    priceAed: 1699,
    label: "Trending · 14 days",
    description: "Two weeks in the Trending section for more discovery.",
    enabled: true,
  },
  {
    id: "pkg-trending-30",
    kind: "trending",
    durationDays: 30,
    priceAed: 2699,
    label: "Trending · 30 days",
    description: "Full month of Trending placement.",
    enabled: true,
  },
  {
    id: "pkg-featured-7",
    kind: "featured",
    durationDays: 7,
    priceAed: 1999,
    label: "Featured · 7 days",
    description: "Featured badge + pin to the top of search results.",
    enabled: true,
  },
  {
    id: "pkg-featured-14",
    kind: "featured",
    durationDays: 14,
    priceAed: 3499,
    label: "Featured · 14 days",
    description: "Stay on top of listings for two weeks.",
    enabled: true,
  },
  {
    id: "pkg-featured-30",
    kind: "featured",
    durationDays: 30,
    priceAed: 5499,
    label: "Featured · 30 days",
    description: "Maximum visibility for a full month.",
    enabled: true,
  },
];

export const DEFAULT_HOST_PROMOTIONS_SETTINGS: HostPromotionsSettings = {
  pageTitle: "Promote your stay",
  pageSubtitle:
    "Pay to appear in Trending Farm Stays or as a Featured listing at the top of search results. Both are paid placements.",
  currency: "INR",
  promotionsEnabled: true,
  packages: DEFAULT_PROMOTION_PACKAGES.map((p) => ({ ...p })),
};

/** @deprecated Use loadHostPromotionsSettings().packages — kept for call sites during migration */
export const PROMOTION_PACKAGES = DEFAULT_PROMOTION_PACKAGES;
