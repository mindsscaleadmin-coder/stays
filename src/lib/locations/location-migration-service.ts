import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CATALOG_KEYS } from "@/lib/server/platform-catalog-repo";
import { normalizeTaxonomy } from "@/lib/admin/taxonomy-data";
import { suggestCountryMarketplace } from "@/lib/admin/country-utils";
import type { TaxonomyData } from "@/lib/admin/taxonomy-types";
import {
  isJunkLocationName,
  normalizeLocationName,
  slugifyLocationName,
} from "@/lib/locations/location-slug";
import { BASE_CURRENCY } from "@/lib/currency";
import type {
  ListingMatch,
  LocationMigrationMode,
  LocationMigrationReport,
  PlannedCountry,
  PlannedLocation,
  SkippedNode,
} from "@/lib/locations/location-types";

const COUNTRY_ALIASES: Record<string, string> = {
  uae: "AE",
  "united arab emirates": "AE",
  emirates: "AE",
  ksa: "SA",
  "saudi arabia": "SA",
  saudi: "SA",
  oman: "OM",
  qatar: "QA",
  india: "IN",
  bharat: "IN",
};

const ISO3_BY_ISO2: Record<string, string> = {
  AE: "ARE",
  SA: "SAU",
  OM: "OMN",
  QA: "QAT",
  IN: "IND",
  GB: "GBR",
  US: "USA",
};

const TZ_BY_ISO2: Record<string, string> = {
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  OM: "Asia/Muscat",
  QA: "Asia/Qatar",
  IN: "Asia/Kolkata",
  GB: "Europe/London",
  US: "America/New_York",
};

const LEVEL1_TYPE: Record<string, string> = {
  AE: "emirate",
  US: "state",
  GB: "region",
  IN: "state",
};

export type MigrateLocationsOptions = {
  mode: LocationMigrationMode;
  backupDir?: string;
  defaultCountryCode?: string;
  client?: PrismaClient;
};

type PreparedPlan = {
  taxonomy: TaxonomyData;
  rawPayload: string;
  countries: PlannedCountry[];
  locations: PlannedLocation[];
  skipped: SkippedNode[];
  warnings: string[];
  errors: string[];
  listingMatches: ListingMatch[];
};

function resolveIso2(code: string | undefined, name: string): string | null {
  const fromCode = code?.trim().toUpperCase();
  if (fromCode && /^[A-Z]{2}$/.test(fromCode)) return fromCode;
  if (fromCode && /^[A-Z]{3}$/.test(fromCode)) {
    const hit = Object.entries(ISO3_BY_ISO2).find(([, iso3]) => iso3 === fromCode);
    if (hit) return hit[0];
  }
  const suggested = suggestCountryMarketplace(code || name);
  if (suggested?.code && /^[A-Z]{2}$/.test(suggested.code)) return suggested.code;
  const alias = COUNTRY_ALIASES[normalizeLocationName(name)];
  return alias ?? null;
}

function uniqueSlug(base: string, used: Set<string>, fallback: string): string {
  const root = base || fallback;
  let slug = root;
  let n = 2;
  while (used.has(slug)) {
    slug = `${root}-${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

function findPlannedCountry(
  countries: PlannedCountry[],
  listingCountry: string
): PlannedCountry | null {
  const raw = listingCountry.trim();
  if (!raw) return null;
  const normalized = normalizeLocationName(raw);
  const byId = countries.find((c) => c.id === raw || c.legacyTaxonomyId === raw);
  if (byId) return byId;
  const byIso = countries.find((c) => c.iso2 === raw.toUpperCase() || c.iso3 === raw.toUpperCase());
  if (byIso) return byIso;
  const aliasIso = COUNTRY_ALIASES[normalized];
  if (aliasIso) {
    const byAlias = countries.find((c) => c.iso2 === aliasIso);
    if (byAlias) return byAlias;
  }
  const exact = countries.filter((c) => normalizeLocationName(c.name) === normalized);
  if (exact.length === 1) return exact[0];
  return null;
}

function childrenOf(
  locations: PlannedLocation[],
  countryId: string,
  parentId: string | null
): PlannedLocation[] {
  return locations.filter(
    (loc) => loc.countryId === countryId && loc.parentId === parentId
  );
}

function matchName(locations: PlannedLocation[], name: string): PlannedLocation[] {
  const normalized = normalizeLocationName(name);
  if (!normalized) return [];
  return locations.filter((loc) => loc.normalizedName === normalized);
}

function matchListing(
  listing: {
    id: string;
    title: string;
    country: string;
    state: string;
    district: string;
    city?: string;
  },
  countries: PlannedCountry[],
  locations: PlannedLocation[]
): ListingMatch {
  const base = {
    listingId: listing.id,
    title: listing.title,
    country: listing.country,
    state: listing.state,
    district: listing.district,
    countryId: null as string | null,
    locationId: null as string | null,
    locationName: null as string | null,
  };

  const looksComposite = /[,/|]/.test(listing.district) && !listing.country.trim() && !listing.state.trim();
  if (looksComposite) {
    return { ...base, status: "unmatched", reason: "composite_location_string" };
  }

  const country = findPlannedCountry(countries, listing.country);
  if (!country) {
    return {
      ...base,
      status: "unmatched",
      reason: listing.country.trim() ? "country_not_in_taxonomy" : "missing_country",
    };
  }

  const stateName = listing.state.trim();
  const districtName = listing.district.trim();
  const level1 = childrenOf(locations, country.id, null);

  if (stateName) {
    const states = matchName(level1, stateName);
    if (states.length > 1) {
      return {
        ...base,
        countryId: country.id,
        status: "ambiguous",
        reason: "ambiguous_state",
      };
    }
    if (states.length === 0) {
      return {
        ...base,
        countryId: country.id,
        status: "country_only",
        reason: "state_not_in_taxonomy",
      };
    }
    const state = states[0];
    if (!districtName) {
      return {
        ...base,
        countryId: country.id,
        locationId: state.id,
        locationName: state.name,
        status: "mapped",
        reason: "mapped_to_admin_level_1",
      };
    }
    const level2 = childrenOf(locations, country.id, state.id);
    const districts = matchName(level2, districtName);
    if (districts.length > 1) {
      return {
        ...base,
        countryId: country.id,
        status: "ambiguous",
        reason: "ambiguous_district",
      };
    }
    if (districts.length === 0) {
      return {
        ...base,
        countryId: country.id,
        locationId: state.id,
        locationName: state.name,
        status: "mapped",
        reason: "district_missing_mapped_to_state",
      };
    }
    const district = districts[0];
    const cityName = (listing.city ?? "").trim();
    if (
      cityName &&
      normalizeLocationName(cityName) !== district.normalizedName
    ) {
      const level3 = childrenOf(locations, country.id, district.id);
      const cities = matchName(level3, cityName);
      if (cities.length > 1) {
        return {
          ...base,
          countryId: country.id,
          status: "ambiguous",
          reason: "ambiguous_city",
        };
      }
      if (cities.length === 1) {
        return {
          ...base,
          countryId: country.id,
          locationId: cities[0].id,
          locationName: cities[0].name,
          status: "mapped",
          reason: "mapped_to_admin_level_3",
        };
      }
    }
    return {
      ...base,
      countryId: country.id,
      locationId: district.id,
      locationName: district.name,
      status: "mapped",
      reason: "mapped_to_admin_level_2",
    };
  }

  if (districtName) {
    return {
      ...base,
      countryId: country.id,
      status: "country_only",
      reason: "district_without_state",
    };
  }

  return {
    ...base,
    countryId: country.id,
    status: "country_only",
    reason: "country_only",
  };
}

function buildGeoPlan(taxonomy: TaxonomyData, defaultCountryCode?: string): Omit<
  PreparedPlan,
  "taxonomy" | "rawPayload" | "listingMatches"
> {
  const skipped: SkippedNode[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const countries: PlannedCountry[] = [];
  const locations: PlannedLocation[] = [];
  const seenIso2 = new Set<string>();

  const launchCode = (defaultCountryCode || process.env.DEFAULT_COUNTRY_CODE || "")
    .trim()
    .toUpperCase();

  const resolvedCountries = taxonomy.countries.map((country) => ({
    source: country,
    iso2: resolveIso2(country.code, country.name),
  }));

  const launchIso2 =
    (launchCode && resolvedCountries.some((c) => c.iso2 === launchCode) ? launchCode : null) ||
    resolvedCountries.find((c) => c.iso2 && c.source.enabled !== false && !c.source.comingSoon)
      ?.iso2 ||
    resolvedCountries.find((c) => c.iso2)?.iso2 ||
    null;

  for (const { source, iso2 } of resolvedCountries) {
    if (!iso2) {
      skipped.push({
        kind: "country",
        id: source.id,
        name: source.name,
        reason: "missing_iso2",
      });
      continue;
    }
    if (seenIso2.has(iso2)) {
      skipped.push({
        kind: "country",
        id: source.id,
        name: source.name,
        reason: "duplicate_iso2",
        detail: iso2,
      });
      continue;
    }
    seenIso2.add(iso2);
    const suggested = suggestCountryMarketplace(iso2) ?? suggestCountryMarketplace(source.name);
    countries.push({
      id: source.id,
      name: source.name.trim(),
      officialName: source.name.trim(),
      iso2,
      iso3: ISO3_BY_ISO2[iso2] ?? null,
      phoneCode: source.dialCode?.trim() || suggested?.dialCode || null,
      currencyCode: (source.currency || suggested?.currency || BASE_CURRENCY).toUpperCase(),
      currencySymbol: source.currencySymbol ?? suggested?.currencySymbol ?? null,
      exchangeRateToAed: source.exchangeRateToAED ?? suggested?.exchangeRateToAED ?? 1,
      taxPct: source.taxPct ?? null,
      taxLabel: source.taxLabel ?? null,
      flag: source.flag ?? suggested?.flag ?? null,
      isActive: source.enabled !== false,
      isLaunchCountry: iso2 === launchIso2,
      comingSoon: Boolean(source.comingSoon),
      timezone: TZ_BY_ISO2[iso2] ?? null,
      legacyTaxonomyId: source.id,
    });
  }

  const countryByTaxonomyId = new Map(countries.map((c) => [c.legacyTaxonomyId, c]));
  const stateByTaxonomyId = new Map<string, PlannedLocation>();

  for (const country of countries) {
    const iso2 = country.iso2;
    const states = taxonomy.states.filter((s) => s.countryId === country.legacyTaxonomyId);
    const junkStates = states.filter((s) => isJunkLocationName(s.name));
    if (states.length > 20 && junkStates.length / states.length >= 0.5) {
      warnings.push(
        `${country.name} (${iso2}): ${junkStates.length}/${states.length} admin-level-1 names look like spreadsheet serials and were skipped. Re-upload State/District columns before importing locations.`
      );
    }

    const usedSlugs = new Set<string>();
    const siblingNames = new Set<string>();
    const level1Type = LEVEL1_TYPE[iso2] ?? "state";

    for (const state of states) {
      if (isJunkLocationName(state.name)) {
        skipped.push({
          kind: "state",
          id: state.id,
          name: state.name,
          reason: "junk_name",
        });
        continue;
      }
      const normalizedName = normalizeLocationName(state.name);
      if (siblingNames.has(normalizedName)) {
        skipped.push({
          kind: "state",
          id: state.id,
          name: state.name,
          reason: "duplicate_sibling",
          detail: country.name,
        });
        continue;
      }
      siblingNames.add(normalizedName);
      const planned: PlannedLocation = {
        id: state.id,
        countryId: country.id,
        parentId: null,
        name: state.name.trim(),
        normalizedName,
        slug: uniqueSlug(slugifyLocationName(state.name), usedSlugs, `loc-${state.id.slice(-6)}`),
        type: state.type?.trim() || level1Type,
        level: 1,
        code: state.code?.trim() || null,
        isActive: state.enabled !== false,
        legacyTaxonomyId: state.id,
      };
      locations.push(planned);
      stateByTaxonomyId.set(state.id, planned);
    }
  }

  const districtSiblingKeys = new Set<string>();
  const districtSlugsByParent = new Map<string, Set<string>>();
  const districtByTaxonomyId = new Map<string, PlannedLocation>();

  for (const district of taxonomy.districts) {
    const parent = stateByTaxonomyId.get(district.stateId);
    if (!parent) {
      skipped.push({
        kind: "district",
        id: district.id,
        name: district.name,
        reason: taxonomy.states.some((s) => s.id === district.stateId)
          ? "orphan_parent"
          : "orphan_parent",
        detail: `stateId=${district.stateId}`,
      });
      continue;
    }
    if (isJunkLocationName(district.name)) {
      skipped.push({
        kind: "district",
        id: district.id,
        name: district.name,
        reason: "junk_name",
      });
      continue;
    }
    const normalizedName = normalizeLocationName(district.name);
    const siblingKey = `${parent.id}:${normalizedName}`;
    if (districtSiblingKeys.has(siblingKey)) {
      skipped.push({
        kind: "district",
        id: district.id,
        name: district.name,
        reason: "duplicate_sibling",
        detail: parent.name,
      });
      continue;
    }
    districtSiblingKeys.add(siblingKey);
    let slugSet = districtSlugsByParent.get(parent.id);
    if (!slugSet) {
      slugSet = new Set();
      districtSlugsByParent.set(parent.id, slugSet);
    }
    locations.push({
      id: district.id,
      countryId: parent.countryId,
      parentId: parent.id,
      name: district.name.trim(),
      normalizedName,
      slug: uniqueSlug(slugifyLocationName(district.name), slugSet, `loc-${district.id.slice(-6)}`),
      type: "district",
      level: 2,
      code: district.code?.trim() || null,
      isActive: district.enabled !== false,
      legacyTaxonomyId: district.id,
    });
    districtByTaxonomyId.set(district.id, locations[locations.length - 1]);
  }

  const citySiblingKeys = new Set<string>();
  const citySlugsByParent = new Map<string, Set<string>>();
  for (const city of taxonomy.cities ?? []) {
    const parent = districtByTaxonomyId.get(city.districtId);
    if (!parent) {
      skipped.push({
        kind: "city",
        id: city.id,
        name: city.name,
        reason: "orphan_parent",
        detail: `districtId=${city.districtId}`,
      });
      continue;
    }
    if (isJunkLocationName(city.name)) {
      skipped.push({
        kind: "city",
        id: city.id,
        name: city.name,
        reason: "junk_name",
      });
      continue;
    }
    const normalizedName = normalizeLocationName(city.name);
    const siblingKey = `${parent.id}:${normalizedName}`;
    if (citySiblingKeys.has(siblingKey)) {
      skipped.push({
        kind: "city",
        id: city.id,
        name: city.name,
        reason: "duplicate_sibling",
        detail: parent.name,
      });
      continue;
    }
    citySiblingKeys.add(siblingKey);
    let slugSet = citySlugsByParent.get(parent.id);
    if (!slugSet) {
      slugSet = new Set();
      citySlugsByParent.set(parent.id, slugSet);
    }
    locations.push({
      id: city.id,
      countryId: parent.countryId,
      parentId: parent.id,
      name: city.name.trim(),
      normalizedName,
      slug: uniqueSlug(slugifyLocationName(city.name), slugSet, `loc-${city.id.slice(-6)}`),
      type: "city",
      level: 3,
      code: city.code?.trim() || null,
      isActive: city.enabled !== false,
      legacyTaxonomyId: city.id,
    });
  }

  if (countries.length === 0) {
    errors.push("No countries could be imported (missing ISO2 or empty catalog).");
  }

  return { countries, locations, skipped, warnings, errors };
}

async function loadTaxonomyRaw(client: PrismaClient): Promise<{ raw: string; taxonomy: TaxonomyData }> {
  const row = await client.platformCatalog.findUnique({ where: { key: CATALOG_KEYS.taxonomy } });
  if (!row?.payload) {
    throw new Error("PlatformCatalog taxonomy row is missing");
  }
  const parsed = JSON.parse(row.payload) as Partial<TaxonomyData>;
  return { raw: row.payload, taxonomy: normalizeTaxonomy(parsed) };
}

async function writeBackup(raw: string, backupDir: string): Promise<string> {
  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(backupDir, `taxonomy-${stamp}.json`);
  await writeFile(filePath, raw, "utf8");
  await writeFile(path.join(backupDir, "taxonomy-latest.json"), raw, "utf8");
  return filePath;
}

function listingDenormalizedNames(
  match: ListingMatch,
  countries: PlannedCountry[],
  locations: PlannedLocation[]
): { country: string; state: string; district: string } | null {
  if (!match.countryId) return null;
  const country = countries.find((c) => c.id === match.countryId);
  if (!country) return null;
  if (!match.locationId) {
    return { country: country.name, state: "", district: "" };
  }
  const location = locations.find((l) => l.id === match.locationId);
  if (!location) return null;
  if (location.level === 1) {
    return { country: country.name, state: location.name, district: "" };
  }
  const parent = locations.find((l) => l.id === location.parentId);
  if (location.level === 3) {
    const state = locations.find((l) => l.id === parent?.parentId);
    return {
      country: country.name,
      state: state?.name ?? "",
      district: parent?.name ?? "",
    };
  }
  return {
    country: country.name,
    state: parent?.name ?? "",
    district: location.name,
  };
}

export function formatLocationMigrationReport(report: LocationMigrationReport): string {
  const skippedByReason = report.skipped.reduce<Record<string, number>>((acc, row) => {
    acc[row.reason] = (acc[row.reason] ?? 0) + 1;
    return acc;
  }, {});
  const skippedSample = report.skipped.slice(0, 15);
  const unmatched = report.listings.rows.filter((r) => r.status === "unmatched" || r.status === "ambiguous");
  const mapped = report.listings.rows.filter((r) => r.status === "mapped");
  const countryOnly = report.listings.rows.filter((r) => r.status === "country_only");

  const lines = [
    "# Location migration report",
    "",
    `Mode: **${report.mode}**`,
    `Ran at: ${report.ranAt}`,
    report.backupPath ? `Taxonomy backup: \`${report.backupPath}\`` : "Taxonomy backup: not written",
    "",
    "## Catalog snapshot",
    "",
    `- Countries in PlatformCatalog: ${report.taxonomy.countriesInCatalog}`,
    `- States in PlatformCatalog: ${report.taxonomy.statesInCatalog}`,
    `- Districts in PlatformCatalog: ${report.taxonomy.districtsInCatalog}`,
    `- Cities in PlatformCatalog: ${report.taxonomy.citiesInCatalog}`,
    "",
    "## Summary",
    "",
    `- countries found: ${report.countries.planned.length}`,
    `- states found: ${report.locations.statesCreated}`,
    `- districts found: ${report.locations.districtsCreated}`,
    `- cities found: ${report.locations.citiesCreated}`,
    `- locations to create: ${Math.max(0, report.locations.planned - report.locations.alreadyExisting)}`,
    `- locations already existing: ${report.locations.alreadyExisting}`,
    `- duplicates: ${skippedByReason.duplicate_sibling ?? 0} skipped sibling names, ${report.listings.ambiguous} ambiguous listings`,
    `- unmatched records: ${report.listings.unmatched}`,
    `- errors: ${report.errors.length}`,
    "",
    "## Import",
    "",
    `- Countries created: ${report.countries.created}`,
    `- Countries updated: ${report.countries.updated}`,
    `- Countries skipped: ${report.countries.skipped}`,
    `- Admin-level-1 locations (states/emirates/regions): ${report.locations.statesCreated}`,
    `- Admin-level-2 locations (districts): ${report.locations.districtsCreated}`,
    `- Admin-level-3 locations (cities): ${report.locations.citiesCreated}`,
    `- Location rows skipped: ${report.locations.skipped}`,
    `- Location rows already in Postgres: ${report.locations.alreadyExisting}`,
    "",
    "### Countries imported",
    "",
    ...(report.countries.planned.length
      ? report.countries.planned.map(
          (c) =>
            `- ${c.name} (\`${c.iso2}\`) id=\`${c.id}\` launch=${c.isLaunchCountry} active=${c.isActive}`
        )
      : ["- none"]),
    "",
    "### Skip reasons",
    "",
    ...Object.entries(skippedByReason).map(([reason, count]) => `- ${reason}: ${count}`),
    "",
    "Sample skipped nodes:",
    "",
    ...(skippedSample.length
      ? skippedSample.map(
          (s) => `- ${s.kind} \`${s.name}\` (${s.id}) — ${s.reason}${s.detail ? ` (${s.detail})` : ""}`
        )
      : ["- none"]),
    "",
    "## Listing mapping",
    "",
    `- Mapped to a location: ${report.listings.mapped}`,
    `- Country only (no locationId): ${report.listings.countryOnly}`,
    `- Unmatched: ${report.listings.unmatched}`,
    `- Ambiguous (not assigned): ${report.listings.ambiguous}`,
    "",
    "### Mapped",
    "",
    ...(mapped.length
      ? mapped.map(
          (r) =>
            `- \`${r.listingId}\` ${r.title} → ${r.locationName} (${r.reason})`
        )
      : ["- none"]),
    "",
    "### Country only",
    "",
    ...(countryOnly.length
      ? countryOnly.map((r) => `- \`${r.listingId}\` ${r.title} — ${r.reason}`)
      : ["- none"]),
    "",
    "### Unmatched / ambiguous (manual review)",
    "",
    ...(unmatched.length
      ? unmatched.map(
          (r) =>
            `- \`${r.listingId}\` ${r.title} — country="${r.country}" state="${r.state}" district="${r.district}" — ${r.reason}`
        )
      : ["- none"]),
    "",
    "## Warnings",
    "",
    ...(report.warnings.length ? report.warnings.map((w) => `- ${w}`) : ["- none"]),
    "",
    "## Errors",
    "",
    ...(report.errors.length ? report.errors.map((e) => `- ${e}`) : ["- none"]),
    "",
    "## Notes",
    "",
    "- PlatformCatalog.taxonomy JSON was not deleted.",
    "- Unmatched listings did not receive a locationId.",
    "- Search still uses Listing.country/state/district strings until a later phase.",
    "",
  ];

  return lines.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");
}

export async function migrateLocationsFromTaxonomy(
  options: MigrateLocationsOptions
): Promise<LocationMigrationReport> {
  const client = options.client ?? prisma;
  const { raw, taxonomy } = await loadTaxonomyRaw(client);
  const geo = buildGeoPlan(taxonomy, options.defaultCountryCode);

  const alreadyExisting = await client.location.count();
  const listingRows = await client.listing.findMany({
    select: { id: true, title: true, country: true, state: true, district: true, payload: true },
    orderBy: { createdAt: "asc" },
  });
  const listingMatches = listingRows.map((row) => {
    let city = "";
    try {
      const parsed = JSON.parse(row.payload) as { city?: string };
      city = typeof parsed.city === "string" ? parsed.city : "";
    } catch {
      city = "";
    }
    return matchListing({ ...row, city }, geo.countries, geo.locations);
  });

  const existingCountries = await client.country.findMany({
    select: { id: true, iso2: true, legacyTaxonomyId: true },
  });
  const existingByIso2 = new Map(existingCountries.map((c) => [c.iso2, c]));
  const existingByLegacy = new Map(
    existingCountries
      .filter((c) => c.legacyTaxonomyId)
      .map((c) => [c.legacyTaxonomyId as string, c])
  );

  let countriesCreated = 0;
  let countriesUpdated = 0;
  for (const country of geo.countries) {
    if (existingByIso2.has(country.iso2) || existingByLegacy.has(country.legacyTaxonomyId)) {
      countriesUpdated += 1;
    } else {
      countriesCreated += 1;
    }
  }

  const backupDir = options.backupDir ?? path.join(process.cwd(), ".data", "taxonomy-backups");
  let backupPath: string | null = null;
  if (options.mode === "apply") {
    backupPath = await writeBackup(raw, backupDir);
    await client.$transaction(
      async (tx) => {
        for (const country of geo.countries) {
          const existing =
            existingByIso2.get(country.iso2) ?? existingByLegacy.get(country.legacyTaxonomyId);
          const data = {
            name: country.name,
            officialName: country.officialName,
            iso2: country.iso2,
            iso3: country.iso3,
            phoneCode: country.phoneCode,
            currencyCode: country.currencyCode,
            currencySymbol: country.currencySymbol,
            exchangeRateToAed: country.exchangeRateToAed,
            taxPct: country.taxPct,
            taxLabel: country.taxLabel,
            flag: country.flag,
            isActive: country.isActive,
            isLaunchCountry: country.isLaunchCountry,
            comingSoon: country.comingSoon,
            timezone: country.timezone,
            legacyTaxonomyId: country.legacyTaxonomyId,
          };
          if (existing) {
            await tx.country.update({ where: { id: existing.id }, data });
          } else {
            await tx.country.create({ data: { id: country.id, ...data } });
          }
        }

        const idRemap = new Map<string, string>();
        for (const country of geo.countries) {
          const existing =
            existingByIso2.get(country.iso2) ?? existingByLegacy.get(country.legacyTaxonomyId);
          idRemap.set(country.id, existing?.id ?? country.id);
        }

        for (const location of geo.locations) {
          const countryId = idRemap.get(location.countryId) ?? location.countryId;
          const parentId = location.parentId
            ? (idRemap.get(location.parentId) ?? location.parentId)
            : null;
          const data = {
            countryId,
            parentId,
            name: location.name,
            normalizedName: location.normalizedName,
            slug: location.slug,
            type: location.type,
            level: location.level,
            code: location.code,
            isActive: location.isActive,
            legacyTaxonomyId: location.legacyTaxonomyId,
          };
          await tx.location.upsert({
            where: { id: location.id },
            create: { id: location.id, ...data },
            update: data,
          });
        }

        for (const match of listingMatches) {
          if (match.status === "unmatched" || match.status === "ambiguous") continue;
          if (!match.countryId) continue;
          const countryId = idRemap.get(match.countryId) ?? match.countryId;
          const locationId =
            match.status === "mapped" && match.locationId ? match.locationId : null;
          const names =
            match.status === "mapped"
              ? listingDenormalizedNames(
                  { ...match, countryId, locationId },
                  geo.countries.map((c) => ({ ...c, id: idRemap.get(c.id) ?? c.id })),
                  geo.locations
                )
              : null;
          const data: {
            countryId: string;
            locationId?: string | null;
            country?: string;
            state?: string;
            district?: string;
          } = { countryId };
          if (match.status === "mapped") {
            data.locationId = locationId;
            if (names && (match.reason === "mapped_to_admin_level_2" || match.reason === "mapped_to_admin_level_3")) {
              data.country = names.country;
              data.state = names.state;
              data.district = names.district;
            } else if (names) {
              data.country = names.country;
              data.state = names.state;
            }
          }
          await tx.listing.update({
            where: { id: match.listingId },
            data,
          });
        }
      },
      { timeout: 180_000 }
    );
  } else {
    backupPath = await writeBackup(raw, backupDir);
  }

  const statesCreated = geo.locations.filter((l) => l.level === 1).length;
  const districtsCreated = geo.locations.filter((l) => l.level === 2).length;
  const citiesCreated = geo.locations.filter((l) => l.level === 3).length;

  return {
    mode: options.mode,
    ranAt: new Date().toISOString(),
    backupPath,
    taxonomy: {
      countriesInCatalog: taxonomy.countries.length,
      statesInCatalog: taxonomy.states.length,
      districtsInCatalog: taxonomy.districts.length,
      citiesInCatalog: (taxonomy.cities ?? []).length,
    },
    countries: {
      created: options.mode === "apply" ? countriesCreated : countriesCreated,
      updated: options.mode === "apply" ? countriesUpdated : countriesUpdated,
      skipped: geo.skipped.filter((s) => s.kind === "country").length,
      planned: geo.countries,
    },
    locations: {
      statesCreated: options.mode === "dry-run" ? statesCreated : statesCreated,
      districtsCreated,
      citiesCreated,
      skipped: geo.skipped.filter((s) => s.kind !== "country").length,
      planned: geo.locations.length,
      alreadyExisting,
    },
    skipped: geo.skipped,
    listings: {
      mapped: listingMatches.filter((r) => r.status === "mapped").length,
      countryOnly: listingMatches.filter((r) => r.status === "country_only").length,
      unmatched: listingMatches.filter((r) => r.status === "unmatched").length,
      ambiguous: listingMatches.filter((r) => r.status === "ambiguous").length,
      rows: listingMatches,
    },
    warnings: geo.warnings,
    errors: geo.errors,
  };
}
