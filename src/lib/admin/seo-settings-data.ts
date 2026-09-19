import { emitSyncEvent } from "@/lib/emit-sync-event";
import { LAUNCH_COUNTRY_CODE } from "@/lib/tax/launch-market";
import { ogLocaleForCountry } from "@/lib/seo/market-url";
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
import type { CountrySeoProfile, ResolvedSeoProfile, SeoSettings } from "./seo-settings-types";

const STORAGE_KEY = "farm-stays-seo-settings";
export const SEO_SETTINGS_SYNC_EVENT = "farm-stays-seo-settings-updated";

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  fallbackSiteName: SITE_NAME,
  fallbackMetaDescription: DEFAULT_DESCRIPTION,
  fallbackMetaKeywords: "farm stays, homestays, rural retreats, India",
  fallbackLogoUrl: "",
  fallbackOgImageUrl: "",
  schemaSameAs: "",
  allowAiCrawlers: true,
  profiles: [
    {
      countryCode: "IN",
      enabled: true,
      siteName: SITE_NAME,
      metaDescription: DEFAULT_DESCRIPTION,
      metaKeywords: "farm stays, homestays, rural retreats, India",
      logoUrl: "",
      ogImageUrl: "",
      extraSitemapUrl: "",
      schemaOrganizationName: SITE_NAME,
      schemaOrganizationUrl: "",
      schemaOrganizationLogo: "",
      schemaOrganizationDescription: DEFAULT_DESCRIPTION,
    },
    {
      countryCode: "AE",
      enabled: false,
      siteName: "Greenfield Farm Stays UAE",
      metaDescription:
        "Discover authentic farm stays, desert retreats, and countryside getaways across the UAE.",
      metaKeywords: "farm stays, desert retreats, UAE, Abu Dhabi, Dubai",
      logoUrl: "",
      ogImageUrl: "",
      extraSitemapUrl: "",
      schemaOrganizationName: "Greenfield Farm Stays UAE",
      schemaOrganizationUrl: "",
      schemaOrganizationLogo: "",
      schemaOrganizationDescription:
        "Discover authentic farm stays, desert retreats, and countryside getaways across the UAE.",
    },
  ],
};

export function parseSchemaSameAs(input?: string | null): string[] {
  if (!input?.trim()) return [];
  return input
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter((url) => url.startsWith("http://") || url.startsWith("https://"));
}

function normalizeProfile(
  profile: Partial<CountrySeoProfile>,
  fallback: SeoSettings
): CountrySeoProfile {
  const countryCode = (profile.countryCode ?? "").trim().toUpperCase();
  const siteName = profile.siteName?.trim() || fallback.fallbackSiteName;
  const metaDescription = profile.metaDescription?.trim() || fallback.fallbackMetaDescription;
  const logoUrl = profile.logoUrl?.trim() ?? "";
  const ogImageUrl = profile.ogImageUrl?.trim() || logoUrl;

  return {
    countryCode,
    enabled: profile.enabled !== false,
    siteName,
    metaDescription,
    metaKeywords: profile.metaKeywords?.trim() ?? "",
    logoUrl,
    ogImageUrl,
    extraSitemapUrl: profile.extraSitemapUrl?.trim() ?? "",
    schemaOrganizationName: profile.schemaOrganizationName?.trim() || siteName,
    schemaOrganizationUrl: profile.schemaOrganizationUrl?.trim() || "",
    schemaOrganizationLogo: profile.schemaOrganizationLogo?.trim() || logoUrl,
    schemaOrganizationDescription:
      profile.schemaOrganizationDescription?.trim() || metaDescription,
  };
}

export function mergeSeoSettings(raw: Partial<SeoSettings> | null): SeoSettings {
  const fallback: SeoSettings = {
    fallbackSiteName: raw?.fallbackSiteName?.trim() || DEFAULT_SEO_SETTINGS.fallbackSiteName,
    fallbackMetaDescription:
      raw?.fallbackMetaDescription?.trim() || DEFAULT_SEO_SETTINGS.fallbackMetaDescription,
    fallbackMetaKeywords:
      raw?.fallbackMetaKeywords?.trim() || DEFAULT_SEO_SETTINGS.fallbackMetaKeywords,
    fallbackLogoUrl: raw?.fallbackLogoUrl?.trim() ?? "",
    fallbackOgImageUrl: raw?.fallbackOgImageUrl?.trim() || raw?.fallbackLogoUrl?.trim() || "",
    schemaSameAs: raw?.schemaSameAs?.trim() ?? DEFAULT_SEO_SETTINGS.schemaSameAs,
    allowAiCrawlers: raw?.allowAiCrawlers !== false,
    profiles: [],
  };

  const profiles =
    Array.isArray(raw?.profiles) && raw.profiles.length > 0
      ? raw.profiles.map((profile) => normalizeProfile(profile, fallback))
      : DEFAULT_SEO_SETTINGS.profiles.map((profile) => normalizeProfile(profile, fallback));

  const byCode = new Map(profiles.map((profile) => [profile.countryCode, profile]));
  for (const seed of DEFAULT_SEO_SETTINGS.profiles) {
    if (!byCode.has(seed.countryCode)) {
      byCode.set(seed.countryCode, normalizeProfile(seed, fallback));
    }
  }

  return {
    ...fallback,
    profiles: Array.from(byCode.values()).sort((a, b) =>
      a.countryCode.localeCompare(b.countryCode)
    ),
  };
}

export function loadSeoSettings(): SeoSettings {
  if (typeof window === "undefined") return mergeSeoSettings(null);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeSeoSettings(null);
    return mergeSeoSettings(JSON.parse(raw) as Partial<SeoSettings>);
  } catch {
    return mergeSeoSettings(null);
  }
}

export function saveSeoSettings(settings: SeoSettings): void {
  if (typeof window === "undefined") return;
  const next = mergeSeoSettings(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitSyncEvent(SEO_SETTINGS_SYNC_EVENT);
}

export function resolveSeoForCountry(
  settings: SeoSettings,
  countryCode: string
): ResolvedSeoProfile {
  const code = countryCode.trim().toUpperCase() || LAUNCH_COUNTRY_CODE;
  const profile = settings.profiles.find(
    (entry) => entry.countryCode === code && entry.enabled
  );

  const siteName = profile?.siteName.trim() || settings.fallbackSiteName;
  const metaDescription = profile?.metaDescription.trim() || settings.fallbackMetaDescription;
  const metaKeywords = profile?.metaKeywords.trim() || settings.fallbackMetaKeywords;
  const logoUrl = profile?.logoUrl.trim() || settings.fallbackLogoUrl;
  const ogImageUrl =
    profile?.ogImageUrl.trim() || profile?.logoUrl.trim() || settings.fallbackOgImageUrl || logoUrl;

  return {
    countryCode: code,
    ogLocale: ogLocaleForCountry(code),
    siteName,
    metaDescription,
    metaKeywords,
    logoUrl,
    ogImageUrl,
    extraSitemapUrl: profile?.extraSitemapUrl.trim() ?? "",
    schemaOrganizationName: profile?.schemaOrganizationName.trim() || siteName,
    schemaOrganizationUrl: profile?.schemaOrganizationUrl.trim() || absoluteUrl("/"),
    schemaOrganizationLogo: profile?.schemaOrganizationLogo.trim() || logoUrl,
    schemaOrganizationDescription:
      profile?.schemaOrganizationDescription.trim() || metaDescription,
    schemaSameAs: parseSchemaSameAs(settings.schemaSameAs),
  };
}

export function collectExtraSitemapUrls(settings: SeoSettings): string[] {
  const urls = new Set<string>();
  for (const profile of settings.profiles) {
    if (!profile.enabled) continue;
    const url = profile.extraSitemapUrl.trim();
    if (url) urls.add(url);
  }
  return Array.from(urls);
}

function imageObject(url: string): Record<string, unknown> | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return { "@type": "ImageObject", url: trimmed };
}

/** Organization + WebSite graph for Google rich results and AI crawlers. */
export function buildSiteGraphJsonLd(
  profile: ResolvedSeoProfile,
  siteUrl: string
): Record<string, unknown> {
  const base = siteUrl.replace(/\/$/, "");
  const orgUrl = profile.schemaOrganizationUrl.trim() || base;
  const orgId = `${base}#organization`;
  const websiteId = `${base}#website`;
  const logo = profile.schemaOrganizationLogo.trim() || profile.logoUrl.trim();

  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": orgId,
    name: profile.schemaOrganizationName,
    url: orgUrl,
    description: profile.schemaOrganizationDescription,
    logo: imageObject(logo),
    sameAs: profile.schemaSameAs.length > 0 ? profile.schemaSameAs : undefined,
  };

  const website: Record<string, unknown> = {
    "@type": "WebSite",
    "@id": websiteId,
    url: base,
    name: profile.siteName,
    description: profile.metaDescription,
    inLanguage: profile.ogLocale.replace("_", "-"),
    publisher: { "@id": orgId },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/listings?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website],
  };
}

/** @deprecated Use buildSiteGraphJsonLd */
export function buildOrganizationJsonLd(
  profile: ResolvedSeoProfile,
  siteUrl: string
): Record<string, unknown> {
  return buildSiteGraphJsonLd(profile, siteUrl);
}
