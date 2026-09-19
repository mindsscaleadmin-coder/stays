import type { Metadata } from "next";
import { mergeSeoSettings, resolveSeoForCountry } from "@/lib/admin/seo-settings-data";
import type { ResolvedSeoProfile, SeoSettings } from "@/lib/admin/seo-settings-types";
import { getSeoSettingsFromDb } from "@/lib/server/seo-settings-repo";
import { readCountryCodeFromCookieHeader } from "./country-seo-cookie";
import {
  buildHreflangAlternates,
  isCrawlerSafeImageUrl,
  marketUrl,
  ogLocaleForCountry,
} from "./market-url";
import { getSiteUrl } from "./site";

export async function loadServerSeoSettings(): Promise<SeoSettings> {
  try {
    return await getSeoSettingsFromDb();
  } catch {
    return mergeSeoSettings(null);
  }
}

export async function resolveServerSeoProfile(
  cookieHeader?: string | null
): Promise<ResolvedSeoProfile> {
  const settings = await loadServerSeoSettings();
  const countryCode = readCountryCodeFromCookieHeader(cookieHeader);
  return resolveSeoForCountry(settings, countryCode);
}

function openGraphImages(profile: ResolvedSeoProfile, title: string) {
  if (!isCrawlerSafeImageUrl(profile.ogImageUrl)) return undefined;
  return [
    {
      url: profile.ogImageUrl,
      alt: title,
      width: 1200,
      height: 630,
    },
  ];
}

export function metadataFromSeoProfile(
  profile: ResolvedSeoProfile,
  options?: {
    title?: string;
    path?: string;
    hreflang?: boolean;
    settings?: SeoSettings;
  }
): Metadata {
  const title = options?.title?.trim() || profile.siteName;
  const description = profile.metaDescription;
  const path = options?.path ?? "/";
  const url = marketUrl(path, profile.countryCode);
  const keywords = profile.metaKeywords
    ? profile.metaKeywords.split(/,\s*/).filter(Boolean)
    : undefined;
  const images = openGraphImages(profile, title);
  const locale = ogLocaleForCountry(profile.countryCode).replace("_", "-");
  const alternateLocales = (options?.settings?.profiles ?? [])
    .filter((entry) => entry.enabled && entry.countryCode !== profile.countryCode)
    .map((entry) => ogLocaleForCountry(entry.countryCode).replace("_", "-"));

  return {
    title: options?.title
      ? { absolute: title }
      : {
          default: profile.siteName,
          template: `%s | ${profile.siteName}`,
        },
    description,
    keywords,
    alternates: {
      canonical: url,
      ...(options?.hreflang && options.settings
        ? { languages: buildHreflangAlternates(options.settings, path) }
        : {}),
    },
    openGraph: {
      type: "website",
      siteName: profile.siteName,
      title,
      description,
      url,
      locale,
      alternateLocale: alternateLocales.length > 0 ? alternateLocales : undefined,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: isCrawlerSafeImageUrl(profile.ogImageUrl) ? [profile.ogImageUrl] : undefined,
    },
  };
}

export async function buildRootMetadata(cookieHeader?: string | null): Promise<Metadata> {
  const settings = await loadServerSeoSettings();
  const profile = resolveSeoForCountry(
    settings,
    readCountryCodeFromCookieHeader(cookieHeader)
  );

  return {
    metadataBase: new URL(getSiteUrl()),
    ...metadataFromSeoProfile(profile, {
      path: "/",
      hreflang: true,
      settings,
    }),
  };
}
