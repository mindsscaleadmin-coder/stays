/** IANA timezone by ISO 3166-1 alpha-2 country code. */
export const TIMEZONE_BY_ISO2: Record<string, string> = {
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  OM: "Asia/Muscat",
  QA: "Asia/Qatar",
  IN: "Asia/Kolkata",
  GB: "Europe/London",
  US: "America/New_York",
  SG: "Asia/Singapore",
};

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  india: "IN",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  oman: "OM",
  qatar: "QA",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  usa: "US",
  singapore: "SG",
};

export const DEFAULT_OPERATIONAL_TIMEZONE = "Asia/Kolkata";

export function iso2FromCountryName(country: string): string | null {
  const key = country.trim().toLowerCase();
  if (!key) return null;
  if (key.length === 2) return key.toUpperCase();
  return COUNTRY_NAME_TO_ISO2[key] ?? null;
}

export function resolveTimezoneFromCountry(input: {
  countryName?: string | null;
  iso2?: string | null;
  dbTimezone?: string | null;
}): string {
  if (input.dbTimezone?.trim()) return input.dbTimezone.trim();
  const iso =
    input.iso2?.trim().toUpperCase() ||
    (input.countryName ? iso2FromCountryName(input.countryName) : null);
  if (iso && TIMEZONE_BY_ISO2[iso]) return TIMEZONE_BY_ISO2[iso];
  return DEFAULT_OPERATIONAL_TIMEZONE;
}

export function formatTimezoneLabel(timezone: string, countryName?: string | null): string {
  if (countryName?.trim()) {
    return `${timezone} (${countryName.trim()})`;
  }
  return timezone;
}
