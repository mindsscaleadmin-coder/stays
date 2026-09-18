export type ListingAdPlacement = "tall" | "short";

export interface ListingAdTargeting {
  country?: string;
  state?: string;
  district?: string;
  parent?: string;
  category?: string;
  subcategory?: string;
}

export interface ListingSidebarAd {
  id: string;
  enabled: boolean;
  placement: ListingAdPlacement;
  /** Empty targeting = show as fallback on any search. */
  targeting?: ListingAdTargeting;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
}

export interface ListingAdsSettings {
  ads: ListingSidebarAd[];
}
