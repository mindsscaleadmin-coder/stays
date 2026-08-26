export type ListingAdPlacement = "tall" | "short";

export interface ListingSidebarAd {
  id: string;
  enabled: boolean;
  placement: ListingAdPlacement;
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
