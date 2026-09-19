import type { SeoSettings } from "@/lib/admin/seo-settings-types";
import { absoluteUrl } from "./site";

/** BCP 47 / Open Graph locale codes for supported markets. */
const COUNTRY_OG_LOCALE: Record<string, string> = {
  IN: "en_IN",
  AE: "en_AE",
  SA: "ar_SA",
  OM: "ar_OM",
  QA: "ar_QA",
  US: "en_US",
  GB: "en_GB",
};

export function ogLocaleForCountry(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  return COUNTRY_OG_LOCALE[code] ?? `en_${code}`;
}

export function hreflangForCountry(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  const og = ogLocaleForCountry(code);
  return og.replace("_", "-");
}

export function marketUrl(path: string, countryCode: string): string {
  const base = absoluteUrl(path);
  const code = countryCode.trim().toUpperCase();
  if (!code) return base;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}market=${encodeURIComponent(code)}`;
}

export function buildHreflangAlternates(
  settings: SeoSettings,
  path = "/"
): Record<string, string> {
  const enabled = settings.profiles.filter((profile) => profile.enabled);
  if (enabled.length === 0) {
    return { "x-default": absoluteUrl(path) };
  }

  const alternates: Record<string, string> = {
    "x-default": marketUrl(path, enabled[0].countryCode),
  };

  for (const profile of enabled) {
    alternates[hreflangForCountry(profile.countryCode)] = marketUrl(path, profile.countryCode);
  }

  return alternates;
}

export function isCrawlerSafeImageUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const value = url.trim();
  if (value.startsWith("data:")) return false;
  return value.startsWith("https://") || value.startsWith("http://");
}
