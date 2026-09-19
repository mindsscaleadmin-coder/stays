import { LAUNCH_COUNTRY_CODE } from "@/lib/tax/launch-market";

export const COUNTRY_SEO_COOKIE = "farm-stays-country";

export function normalizeCountryCode(code?: string | null): string {
  const normalized = code?.trim().toUpperCase();
  return normalized || LAUNCH_COUNTRY_CODE;
}

/** Client: persist selected country for server-side SEO on the next request. */
export function writeCountrySeoCookie(countryCode: string): void {
  if (typeof document === "undefined") return;
  const code = normalizeCountryCode(countryCode);
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${COUNTRY_SEO_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; samesite=lax`;
}

/** Server: read country from request cookies. */
export function readCountryCodeFromCookieHeader(cookieHeader?: string | null): string {
  if (!cookieHeader) return LAUNCH_COUNTRY_CODE;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COUNTRY_SEO_COOKIE) {
      try {
        return normalizeCountryCode(decodeURIComponent(rest.join("=")));
      } catch {
        return normalizeCountryCode(rest.join("="));
      }
    }
  }
  return LAUNCH_COUNTRY_CODE;
}
