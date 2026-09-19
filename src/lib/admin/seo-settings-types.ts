export interface CountrySeoProfile {
  countryCode: string;
  enabled: boolean;
  siteName: string;
  metaDescription: string;
  metaKeywords: string;
  /** Site / brand logo URL or data URL */
  logoUrl: string;
  /** Open Graph / social share image; falls back to logo when empty */
  ogImageUrl: string;
  /** Optional extra sitemap URL for this market (e.g. country-specific index) */
  extraSitemapUrl: string;
  /** Organization schema.org overrides */
  schemaOrganizationName: string;
  schemaOrganizationUrl: string;
  schemaOrganizationLogo: string;
  schemaOrganizationDescription: string;
}

export interface SeoSettings {
  /** Used when no country profile matches or profile is disabled */
  fallbackSiteName: string;
  fallbackMetaDescription: string;
  fallbackMetaKeywords: string;
  fallbackLogoUrl: string;
  fallbackOgImageUrl: string;
  /** Comma- or newline-separated social/profile URLs for schema.org sameAs */
  schemaSameAs: string;
  /** When false, AI crawlers are blocked in robots.txt */
  allowAiCrawlers: boolean;
  profiles: CountrySeoProfile[];
}

export type ResolvedSeoProfile = {
  countryCode: string;
  ogLocale: string;
  siteName: string;
  metaDescription: string;
  metaKeywords: string;
  logoUrl: string;
  ogImageUrl: string;
  extraSitemapUrl: string;
  schemaOrganizationName: string;
  schemaOrganizationUrl: string;
  schemaOrganizationLogo: string;
  schemaOrganizationDescription: string;
  schemaSameAs: string[];
};

export const SEO_LOGO_SPECS = {
  maxFileBytes: 1_500_000,
  maxFileLabel: "1.5 MB",
  recommendedWidth: 512,
  recommendedHeight: 512,
  accept: "image/png,image/jpeg,image/webp,image/svg+xml",
  acceptLabel: "PNG, JPG, WebP, or SVG",
} as const;

export const SEO_OG_IMAGE_SPECS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxFileLabel: "2 MB",
  recommendedWidth: 1200,
  recommendedHeight: 630,
  recommendedAspect: "1.91:1",
  accept: "image/png,image/jpeg,image/webp",
  acceptLabel: "PNG, JPG, or WebP",
} as const;
