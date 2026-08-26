export type LocationMigrationMode = "dry-run" | "apply";

export type LocationSkipReason =
  | "junk_name"
  | "orphan_parent"
  | "duplicate_sibling"
  | "missing_iso2"
  | "duplicate_iso2";

export type ListingMatchStatus =
  | "mapped"
  | "country_only"
  | "unmatched"
  | "ambiguous";

export type PlannedCountry = {
  id: string;
  name: string;
  officialName: string | null;
  iso2: string;
  iso3: string | null;
  phoneCode: string | null;
  currencyCode: string;
  currencySymbol: string | null;
  exchangeRateToAed: number;
  taxPct: number | null;
  taxLabel: string | null;
  flag: string | null;
  isActive: boolean;
  isLaunchCountry: boolean;
  comingSoon: boolean;
  timezone: string | null;
  legacyTaxonomyId: string;
};

export type PlannedLocation = {
  id: string;
  countryId: string;
  parentId: string | null;
  name: string;
  normalizedName: string;
  slug: string;
  type: string;
  level: number;
  code: string | null;
  isActive: boolean;
  legacyTaxonomyId: string;
};

export type SkippedNode = {
  kind: "country" | "state" | "district" | "city";
  id: string;
  name: string;
  reason: LocationSkipReason;
  detail?: string;
};

export type ListingMatch = {
  listingId: string;
  title: string;
  country: string;
  state: string;
  district: string;
  status: ListingMatchStatus;
  countryId: string | null;
  locationId: string | null;
  locationName: string | null;
  reason: string;
};

export type LocationMigrationReport = {
  mode: LocationMigrationMode;
  ranAt: string;
  backupPath: string | null;
  taxonomy: {
    countriesInCatalog: number;
    statesInCatalog: number;
    districtsInCatalog: number;
    citiesInCatalog: number;
  };
  countries: {
    created: number;
    updated: number;
    skipped: number;
    planned: PlannedCountry[];
  };
  locations: {
    statesCreated: number;
    districtsCreated: number;
    citiesCreated: number;
    skipped: number;
    planned: number;
    alreadyExisting: number;
  };
  skipped: SkippedNode[];
  listings: {
    mapped: number;
    countryOnly: number;
    unmatched: number;
    ambiguous: number;
    rows: ListingMatch[];
  };
  warnings: string[];
  errors: string[];
};
