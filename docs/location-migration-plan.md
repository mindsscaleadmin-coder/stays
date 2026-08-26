# Location migration plan

**Status:** Phase 1 schema is in local Postgres. Taxonomy import **applied**: India (`IN`) country row created; 10,324 junk/orphan location rows skipped; 11 listings left unmapped. PlatformCatalog.taxonomy JSON was not deleted. **Wait for a real India State/District upload (and UAE in catalog if those listings should map) before location APIs.**

This document is the Phase 0 analysis for upgrading location from `PlatformCatalog.taxonomy` JSON + listing name strings to a normalized `Country` → `Location` tree, while keeping the existing Next.js 14 / Prisma / Supabase / Stripe platform intact.

---

## 1. Current location architecture

Farm Stays is a Next.js 14 App Router monolith. Location is **not** a first-class database domain. It is split across three layers that must stay in sync by convention:

```
Admin edits
  → TaxonomyData (in-memory + persist)
       ├─ SHARED_DB=1 → PATCH /api/platform/taxonomy
       │                 → PlatformCatalog.key = "taxonomy" (JSON string)
       └─ SHARED_DB=0 → localStorage "farm-stays-taxonomy"

Host listing form
  → picks taxonomy IDs (countryId / stateId / districtId)
  → resolveListingLabels() converts IDs → names
  → POST /api/listings stores:
       Listing.country / .state / .district  (string columns)
       Listing.payload                       (stringified SubmittedListing, also includes names + city + mapEmbedUrl)

Guest search
  → /listings?country=&state=&district=  (names, not IDs)
  → GET /api/listings?country=&state=&district=
  → Prisma equals/contains on Listing string columns
```

### What exists in Postgres today (`prisma/schema.prisma`)

- **No** `Country`, `State`, `District`, or `Location` tables.
- **No** `lat` / `lng` on `Listing`.
- **No** PostGIS.
- **No** `prisma/migrations` folder in this repo. Local/dev currently uses `npx prisma db push` (`scripts/dev.sh`). `package.json` also exposes `db:migrate`.
- `Listing.payload` is a **String** (stringified JSON), not Prisma `Json`.
- `Listing.pricePerNight` is `Float` (out of scope for this work).

`Listing` filter columns today:

| Column | Role |
|---|---|
| `country` | denormalized country **name** |
| `state` | denormalized admin-level-1 **name** (emirate/state/region) |
| `district` | denormalized admin-level-2 **name** |
| `parentCategory` / `category` / `subcategory` | stay-type taxonomy (not geo) |

Indexes already present: `[status, country]`, `[country, state, district]`.

### Taxonomy JSON shape (`src/lib/admin/taxonomy-types.ts`)

`TaxonomyData` is a **mixed catalog**: geo **and** stay-type filters live in the same blob.

Geo:

- `countries[]` — `id`, `name`, `code?`, `flag?`, `currency?`, `currencySymbol?`, `exchangeRateToAED?`, `taxPct?`, `taxLabel?`, `dialCode?`, `enabled?`, `comingSoon?`
- `states[]` — `id`, `name`, `countryId`, `enabled?`
- `districts[]` — `id`, `name`, `stateId`, `enabled?`

Stay-type (must **not** move into Location):

- `parents` / `categories` / `subcategories`
- `mainTabs` (hard-coded built-ins include `"country" | "state" | "district"`)
- extra/feature/custom filters

Built-in geo tabs are permanently named `country` / `state` / `district`. Admin can relabel them (e.g. “Emirates”), but the IDs stay fixed. That is the main “hard-coded hierarchy” in the product today.

### Dual store

`NEXT_PUBLIC_USE_SHARED_DB=1` (`src/lib/shared-db.ts`) is the production-shaped path. Taxonomy then loads/saves via `/api/platform/taxonomy`. When the flag is off, `loadTaxonomy()` / `saveTaxonomy()` use `localStorage` key `farm-stays-taxonomy`.

Listings have the same split: `src/lib/listings/submission-data.ts` vs `src/lib/server/listings-repo.ts`.

### Auth / demo (must not change)

- `requireSessionUser()` — Supabase JWT cookies (`src/lib/auth/session.ts`).
- `requireAdmin()` / `requireHost()` — `src/lib/auth/guards.ts`.
- Admin = active `PlatformStaff` row, **never** JWT `user_metadata.roles`.
- `isDemoApiMode()` is true only when `NODE_ENV !== "production"` **and** Supabase is unset (`src/lib/auth/booking-access.ts`). Production cannot enter demo mode.

Taxonomy GET is public. Taxonomy PATCH already uses `requireAdmin()`.

### Seed geo (not India)

Default `SEED_TAXONOMY` countries: UAE (`c1`), Saudi Arabia (`c2`), Oman (`c3`, coming soon), Qatar (`c4`, coming soon). Built-in CSV presets in `country-geo.ts` also include `IN` (Kerala/Goa/Rajasthan as a small pack) plus GCC packs. Guest “nearby” centroids in `src/lib/geo/guest-location.ts` are **UAE/GCC hardcoded**.

### Maps today

Hosts paste a Google Maps / OSM **embed URL** (`mapEmbedUrl` in payload). Parsed by `src/lib/listings/map-embed.ts`. No geocoding API, no stored coordinates, no map picker.

`SubmittedListing.city` is copied from **district name** (`resolveListingLabels` sets `city: district`). It is payload-only, not a Prisma column.

### Search today (exact names, not descendants)

- Country: fuzzy alias tokens (`locationMatchesCountry` / `countryMatchTokens` in `src/lib/currency.ts`) against `Listing.country` (and sometimes a haystack of country+state+district).
- State / district: case-insensitive **equals** on the listing string. Searching “Kerala” does **not** include child districts unless those listings also store `state = "Kerala"`.
- Destinations page: cards from taxonomy; stay counts by `stay.location.includes(name)` substring (`submissionToStay` builds `"{district}, {state}, {country}"`).
- Guest header country: `CountryProvider` stores ISO code in `localStorage` (`farm-stays-selected-country`).

### API conventions today (do not invent a new envelope)

Existing handlers typically return:

- `{ data }` (taxonomy)
- `{ listings, shared: true }` (listings)
- `{ error: string }` on failure

There is **no** project-wide `{ success, data, meta }` wrapper. New location APIs should follow `{ data }` / `{ error }` (optionally `code` inside error later) rather than a parallel response style.

### Tests

There is **no** test runner in `package.json` and no `*.test.ts` / `*.spec.ts` files. Phase 30 will need a runner (recommend Vitest + Prisma test DB) as a later, separate step — not Phase 1.

### Files the prompt named that do not exist

- `src/lib/listings/listing-types.ts` — listing shape is `src/lib/listings/submission-types.ts` (`SubmittedListing`).

---

## 2. All files using taxonomy

**Core types / persist**

| File | Role |
|---|---|
| `src/lib/admin/taxonomy-types.ts` | `Country` / `State` / `District` / `TaxonomyData` / built-in tabs |
| `src/lib/admin/taxonomy-data.ts` | Seed, normalize, localStorage load/save |
| `src/lib/admin/taxonomy-api.ts` | Shared-DB fetch/save `/api/platform/taxonomy` |
| `src/lib/admin/taxonomy-nav.ts` | Guest nav + destination cards + `/listings?country&state&district` hrefs |
| `src/lib/admin/country-geo.ts` | CSV/JSON/GeoJSON parse, GCC+IN presets, merge/replace into states/districts |
| `src/lib/admin/country-utils.ts` | Name→country match, pricing config, header `Country` mapping |
| `src/lib/server/platform-catalog-repo.ts` | `CATALOG_KEYS.taxonomy`, get/save JSON |
| `src/app/api/platform/taxonomy/route.ts` | GET public, PATCH `requireAdmin` |
| `src/components/providers/admin-taxonomy-provider.tsx` | Client source of truth; relabel listings on rename |
| `src/components/providers/app-providers.tsx` | Mounts taxonomy provider |

**Admin UI**

| File | Role |
|---|---|
| `src/app/[locale]/admin/countries/page.tsx` | Countries page |
| `src/components/dashboard/admin-countries-content.tsx` | Create/edit country + location upload |
| `src/app/[locale]/admin/settings/filters/page.tsx` | Filter editor (geo + stay-type tabs) |
| `src/components/dashboard/admin-filter-panel.tsx` | State/district CRUD, country-scoped lists |
| `src/components/dashboard/admin-settings-shell.tsx` | Settings nav (“Filter”) |
| `src/components/dashboard/admin-nav.ts` | Nav item “Countries” |

**Guest / host consumers of taxonomy geo**

| File | Role |
|---|---|
| `src/components/providers/country-provider.tsx` | Header country switcher |
| `src/components/search/search-filter-bar.tsx` | Country/state/district dropdowns |
| `src/components/search/search-results-content.tsx` | Applies URL + header country to search |
| `src/components/search/advanced-filter-panel.tsx` | Extra filters (stay-type, not geo) |
| `src/components/home/home-page-content.tsx` | Taxonomy-driven home modules |
| `src/components/layout/mega-menu.tsx` | Nav from taxonomy |
| `src/components/destinations/destinations-page-content.tsx` | Destination cards |
| `src/components/listing/property-listing-detail-page.tsx` | Taxonomy for related/filter labels |
| `src/components/booking/checkout-content.tsx` | Country/currency from taxonomy |
| `src/components/dashboard/listing-filter-fields.tsx` | Host country→state→district selects |
| `src/components/dashboard/host-new-listing-content.tsx` | Create listing |
| `src/components/dashboard/host-listing-manage-content.tsx` | Edit listing |
| `src/components/dashboard/host-pricing-content.tsx` | Country tax/currency |
| `src/components/dashboard/host-add-room-content.tsx` | Country pricing config |
| `src/components/dashboard/host-profile-content.tsx` | Host country |
| `src/components/auth/host-signup-content.tsx` | Signup country |
| `src/components/dashboard/active-listing-panel.tsx` | Admin listing filters by country/state |
| `src/components/dashboard/admin-hosts-content.tsx` | Host list geo filter |
| `src/components/dashboard/admin-users-content.tsx` | User list geo filter |
| `src/components/dashboard/admin-financial-content.tsx` | Country money settings |
| `src/components/dashboard/admin-analytics-content.tsx` | Breakdown by country |
| `src/components/dashboard/admin-content-policy-content.tsx` | Policy + listing location display |
| `src/lib/listings/validate-listing-filters.ts` | Required country/state/district IDs → names |
| `src/lib/listings/public-listings.ts` | Client-side filter using taxonomy + name match |
| `src/lib/admin/financial-data.ts` | Tax/currency by listing country name |
| `src/lib/admin/listing-quality-rules-types.ts` | Quality rules may reference location fields |
| `src/lib/mock/data.ts` | Fallback dest/category hrefs |

---

## 3. All files using `Listing.country` (name string)

**Write / persist**

- `src/lib/server/listings-repo.ts` — copies `SubmittedListing.country` onto column; search `contains` + aliases
- `src/app/api/listings/route.ts` — query param `country`; relabel patch
- `src/lib/listings/relabel-listings.ts` / `relabel-listings-api.ts` — admin rename rewrite
- `src/lib/listings/submission-data.ts` — localStorage listing create/update
- `src/lib/listings/submission-types.ts` — `SubmittedListing.country`
- `src/lib/listings/listing-seeds.ts` — seed rows (`"United Arab Emirates"`)
- `src/lib/booking/ensure-listing.ts` — stub listing country `""`
- `src/components/providers/admin-taxonomy-provider.tsx` — schedules country relabel
- `src/components/dashboard/host-new-listing-content.tsx`
- `src/components/dashboard/host-listing-manage-content.tsx`
- `src/components/dashboard/host-house-rules-content.tsx`
- `src/components/dashboard/host-pricing-content.tsx`

**Read / match / display**

- `src/lib/listings/match-listing.ts`
- `src/lib/listings/public-listings.ts`
- `src/lib/listings/public-listings-api.ts`
- `src/lib/listings/public-listings-server.ts`
- `src/lib/listings/submission-to-stay.ts` — `location` string + `currencyForCountryName(listing.country)`
- `src/lib/listings/validate-listing-filters.ts` — name → taxonomy id
- `src/lib/listings/listing-quality-validation.ts`
- `src/lib/listings/use-public-listings.ts`
- `src/app/[locale]/listings/page.tsx`
- `src/components/search/search-filter-bar.tsx`
- `src/components/search/search-results-content.tsx`
- `src/components/dashboard/active-listing-panel.tsx`
- `src/components/dashboard/admin-hosts-content.tsx`
- `src/components/dashboard/admin-users-content.tsx`
- `src/components/dashboard/admin-user-detail-content.tsx`
- `src/components/dashboard/admin-host-detail-content.tsx`
- `src/lib/admin/platform-analytics-data.ts`
- `src/lib/admin/financial-data.ts`
- `src/lib/admin/announcement-audience.ts`
- `src/lib/admin/taxonomy-nav.ts`
- `src/lib/booking/list-bookings.ts` (listing include / display)

**User/host “country” (not Listing, but name-coupled)**

- `src/components/providers/auth-provider.tsx`
- `src/lib/admin/user-data.ts`
- `src/lib/admin/impersonation.ts`
- `src/lib/auth/demo-auth.ts`
- `src/lib/host/host-pricing-data.ts`
- `src/components/auth/host-signup-content.tsx`
- `src/components/dashboard/host-profile-content.tsx`
- `src/components/dashboard/host-get-verified-content.tsx`
- `src/components/dashboard/admin-platform-config-content.tsx`

Do **not** treat host-profile `country` as `Listing.country` during migration, but both should eventually resolve through the same `Country` table.

---

## 4. All files using `Listing.state`

- `src/lib/server/listings-repo.ts`
- `src/app/api/listings/route.ts`
- `src/lib/listings/relabel-listings.ts`
- `src/lib/listings/match-listing.ts` (exact equals)
- `src/lib/listings/public-listings.ts`
- `src/lib/listings/submission-types.ts` / `submission-data.ts` / `listing-seeds.ts`
- `src/lib/listings/submission-to-stay.ts`
- `src/lib/listings/validate-listing-filters.ts`
- `src/lib/listings/listing-quality-validation.ts`
- `src/app/[locale]/listings/page.tsx`
- `src/components/search/search-filter-bar.tsx`
- `src/components/search/search-results-content.tsx`
- `src/components/dashboard/listing-filter-fields.tsx`
- `src/components/dashboard/host-new-listing-content.tsx`
- `src/components/dashboard/host-listing-manage-content.tsx`
- `src/components/dashboard/host-house-rules-content.tsx`
- `src/components/dashboard/host-pricing-content.tsx`
- `src/components/dashboard/active-listing-panel.tsx`
- `src/components/dashboard/admin-hosts-content.tsx`
- `src/components/dashboard/admin-users-content.tsx`
- `src/components/dashboard/admin-user-detail-content.tsx`
- `src/components/dashboard/admin-host-detail-content.tsx`
- `src/components/providers/admin-taxonomy-provider.tsx`
- `src/lib/admin/taxonomy-nav.ts`
- `src/lib/admin/platform-analytics-data.ts` (groupBy state)
- `src/lib/admin/country-geo.ts` (upload rows, not listing)
- `src/lib/booking/list-bookings.ts`

---

## 5. All files using `Listing.district`

Same persist/search/host/admin set as `state`, plus:

- `src/lib/listings/validate-listing-filters.ts` — `city` is set from district
- `src/lib/listings/relabel-listings.ts` — district rename also rewrites `listing.city`
- `src/lib/listings/match-listing.ts` — `q` also searches `listing.city`
- `src/lib/admin/platform-analytics-data.ts` — `state|district` grouping
- `src/lib/server/host-analytics-repo.ts` (payload analytics, district field)

---

## 6. Current admin location workflow

1. **Countries** — `/admin/countries` (`admin-countries-content.tsx`)
   - Create/edit country marketplace fields (ISO code, currency, tax, enabled, coming soon).
   - Optional location source: none / built-in preset / file upload.
   - Upload: CSV, JSON, GeoJSON via `parseLocationUpload` (`country-geo.ts`). ISO3→ISO2. Columns like `state,district` / GADM `NAME_1`/`NAME_2`.
   - Save calls `saveCountry()` in `admin-taxonomy-provider.tsx` (async). If shared DB, persists whole `TaxonomyData` via `PATCH /api/platform/taxonomy`.
   - Merge vs replace states/districts for that country (`applyCountryLocations`).
   - Counts link into Filter with `?tab=state&country=<id>`.

2. **Filter** — `/admin/settings/filters` (`admin-filter-panel.tsx`)
   - CRUD for countries, states, districts **and** stay-type tabs.
   - State list is country-scoped; district list is state-scoped.
   - Rename of country/state/district **relabels existing listings** (`relabelListing` + `/api/listings` relabel) so stored **names** stay aligned. This is the current “source of truth” workaround.

3. There is **no** location tree deeper than district, **no** aliases, **no** merge, **no** deactivate-without-delete beyond `enabled: false` on some records.

---

## 7. Current host location workflow

Create: `/host/listings/new` (`host-new-listing-content.tsx`)

1. `ListingFilterFields` — three dependent selects: country → state → district (taxonomy IDs).
2. `validateListingFilters` requires those IDs when the corresponding main tab is enabled.
3. `resolveListingLabels` writes **names** onto the listing (`city` = district name).
4. Optional `mapEmbedUrl` paste (not a picker, not lat/lng).
5. Quality rules may require map embed (`listing-quality-validation.ts`).
6. Persist via listings store → `/api/listings` when shared DB is on.

Edit: `/host/listings/[id]/edit` and manage flow reuse the same filter fields (`listingToFilterValues` maps stored names back to taxonomy IDs by **name match**, scoped by parent). If admin renamed a node and relabel failed, the host form can fail to re-select the old IDs.

There is **no** address search, **no** map marker, **no** coordinate save.

---

## 8. Current guest search workflow

1. Header country (`CountryProvider`) scopes marketplace currency and default search country.
2. `/listings` query params: `country`, `state`, `district`, plus stay-type and `q`.
3. Server: `getPublicStaysFromStore` → `searchListings` in `listings-repo.ts` (Prisma on string columns).
4. Client filter bar can change state/district and push the same query params.
5. Match rules: country aliases; state/district exact; `q` substring across title + geo names + stay types.
6. Destinations: taxonomy cards → `/listings?country|state|district=<name>`.
7. “Nearby”: browser geolocation mapped to **hardcoded GCC centroids** (`GEO_AREAS`), then string-match against `stay.location`. Not a radius query.

SEO location URLs like `/farmstays/india/kerala/...` **do not exist**. Locale routing is `/[locale]/listings`.

---

## 9. Proposed migration architecture

### 9.1 Non-negotiables

- Stay a Next.js + Prisma monolith. No Nest, Express, or location microservice.
- **One** geo source of truth after cutover: Postgres `Country` + `Location`.
- Do **not** permanently run JSON taxonomy geo **and** Location tables as independent editors.
- Do **not** move stay-type taxonomy (`parent` / `category` / `subcategory` / extra filters) into Location.
- Do **not** delete `Listing.country` / `state` / `district` in the first migrations.
- Do **not** import the world via Google Places.
- Do **not** touch Stripe, booking state machine, or webhook confirm logic.
- Shared DB (`NEXT_PUBLIC_USE_SHARED_DB=1`) is the only supported persist path for new location writes. No new localStorage location store.
- Auth stays `requireAdmin` / `requireHost` / `PlatformStaff`.
- Booking spine must keep working on name columns until search is switched to IDs.

### 9.2 Target model

```
Country 1──* Location
Location 1──* Location          (parentId, arbitrary depth)
Location 1──* LocationAlias
Location 1──* LocationTranslation
Location 1──* Listing           (listing.locationId = most specific node)

Listing.countryId → Country     (required once mapped)
Listing.locationId → Location   (nullable until mapped; then required for new listings)
Listing.latitude / longitude    (Decimal, nullable)
Listing.country / state / district  remain as denormalized names
```

Country is a **separate** top-level entity (marketplace config: currency, tax, launch flags). It is not a Location row. Top-level admin units (Kerala, Dubai, California) have `parentId = null` and `countryId` set.

Location `type` is a **string** (not a Prisma enum): `state`, `emirate`, `region`, `province`, `district`, `county`, `city`, `town`, `village`, `neighborhood`, `area`, `island`, `resort_area`, `tourist_destination`, plus others as needed.

### 9.3 Exact Prisma schema (proposed)

This is what Phase 1 will add after approval. Listing money types stay `Float` (out of scope). Coordinates use `Decimal` as requested.

```prisma
model Country {
  id                    String     @id @default(cuid())
  name                  String
  officialName          String?
  iso2                  String     @unique
  iso3                  String?
  numericCode           String?
  phoneCode             String?
  currencyCode          String     @default("AED")
  currencySymbol        String?
  /// AED per 1 unit of this currency (existing marketplace rule)
  exchangeRateToAed     Float      @default(1)
  defaultLanguage       String     @default("en")
  timezone              String?
  latitude              Decimal?   @db.Decimal(10, 7)
  longitude             Decimal?   @db.Decimal(10, 7)
  taxPct                Float?
  taxLabel              String?
  flag                  String?
  isActive              Boolean    @default(true)
  isLaunchCountry       Boolean    @default(false)
  comingSoon            Boolean    @default(false)
  bookingEnabled        Boolean    @default(true)
  propertyPublishingEnabled Boolean @default(true)
  /// Preserve taxonomy JSON id (c1, c2, …) for matching
  legacyTaxonomyId      String?    @unique
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt
  locations             Location[]
  listings              Listing[]  @relation("ListingCountry")

  @@index([isActive, isLaunchCountry])
}

model Location {
  id              String     @id @default(cuid())
  countryId       String
  country         Country    @relation(fields: [countryId], references: [id], onDelete: Restrict)
  parentId        String?
  parent          Location?  @relation("LocationTree", fields: [parentId], references: [id], onDelete: Restrict)
  children        Location[] @relation("LocationTree")
  name            String
  normalizedName  String
  slug            String
  type            String
  level           Int
  code            String?
  latitude        Decimal?   @db.Decimal(10, 7)
  longitude       Decimal?   @db.Decimal(10, 7)
  timezone        String?
  isActive        Boolean    @default(true)
  sortOrder       Int        @default(0)
  legacyTaxonomyId String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  aliases         LocationAlias[]
  translations    LocationTranslation[]
  listings        Listing[]  @relation("ListingLocation")

  @@index([countryId, parentId])
  @@index([countryId, type])
  @@index([countryId, slug])
  @@index([normalizedName])
  @@index([isActive])
}

model LocationAlias {
  id               String   @id @default(cuid())
  locationId       String
  location         Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  alias            String
  normalizedAlias  String
  languageCode     String   @default("en")
  createdAt        DateTime @default(now())

  @@index([normalizedAlias])
  @@index([locationId])
  @@unique([locationId, normalizedAlias, languageCode])
}

model LocationTranslation {
  id           String   @id @default(cuid())
  locationId   String
  location     Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  languageCode String
  name         String
  slug         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([locationId, languageCode])
}
```

**Listing additions (all nullable except booleans with defaults):**

```prisma
  countryId         String?
  countryRef        Country?  @relation("ListingCountry", fields: [countryId], references: [id])
  locationId        String?
  location          Location? @relation("ListingLocation", fields: [locationId], references: [id])
  latitude          Decimal?  @db.Decimal(10, 7)
  longitude         Decimal?  @db.Decimal(10, 7)
  address           String?
  postalCode        String?
  timezone          String?
  showExactLocation Boolean   @default(false)

  country String @default("")   // keep
  state   String @default("")   // keep
  district String @default("")  // keep

  @@index([countryId, status])
  @@index([locationId, status])
```

**Sibling uniqueness (duplicate names allowed across parents):** Prisma `@@unique([countryId, parentId, normalizedName])` is **unsafe** on PostgreSQL because `NULL parentId` values are distinct in a UNIQUE constraint (multiple Keralas could be inserted). Phase 1 SQL must add:

```sql
CREATE UNIQUE INDEX location_sibling_name_uidx
  ON "Location" ("countryId", COALESCE("parentId", ''), "normalizedName");

CREATE UNIQUE INDEX location_sibling_slug_uidx
  ON "Location" ("countryId", COALESCE("parentId", ''), "slug");
```

Inspect generated SQL before apply. Existing `Listing` rows get `NULL` FKs — **no data rewrite in Phase 1**.

**Do not add** `stateId` / `districtId` columns on Listing.

### 9.4 Compatibility layer (controlled, temporary)

Until Filter / host / search are switched:

1. **Keep** `PlatformCatalog.taxonomy` as the **live editor** for geo **until** an import has been proven and admin UI writes Country/Location.
2. After import, introduce `taxonomyGeoFromDb()` that **projects** Country + Location into `TaxonomyData.countries/states/districts`:
   - countries ← `Country`
   - states ← locations with `parentId IS NULL` (level 1: state / emirate / region / …)
   - districts ← locations whose parent is level 1 (level 2)
   - deeper nodes (city/area) are **not** shown in the old three-dropdown UI until the host picker ships
3. Stay-type arrays continue to come from the same catalog JSON (stripped of geo or with geo overwritten by the projection).
4. Dual-write window: admin Countries/Filter mutations write **Location tables first**, then refresh the JSON projection (or stop writing geo into JSON once GET is derived).
5. End state: JSON catalog no longer contains `countries/states/districts`. Backup of the original blob is retained.

This avoids two independent taxonomies. The adapter is a **read model**, not a second editor.

### 9.5 Listing source of truth (after mapping)

- **Canonical:** `Listing.locationId` (most specific known node) + `Listing.countryId`.
- **Denormalized:** `country` / `state` / `district` filled from breadcrumb (country name; first admin unit; second admin unit or the node itself if depth &lt; 2).
- On Location rename/move/merge: rewrite denormalized columns in the same transaction (replaces today’s string relabel).
- Reject `LOCATION_COUNTRY_MISMATCH` when `location.countryId !== listing.countryId`.
- Unmatched listings keep `locationId = null` and continue to search by strings. **Never guess.**

### 9.6 Services / APIs (later phases — not Phase 1)

`src/lib/locations/` as specified (service, search, hierarchy, migration, validation, slug, types, geo, geocoding).

Public routes under existing `src/app/api/…`. Admin under `src/app/api/admin/locations/`. Auth: `requireAdmin` for mutations; search can be public.

Geocoding: interface only; default no-op or OSM Nominatim behind the interface; never on page load or listing search.

Descendant search: one recursive CTE, not N queries.

Nearby / map bounds: SQL on `latitude`/`longitude` without PostGIS; `GeoSearchService` is the swap point for `ST_DWithin` later.

SEO: additive `[locale]/farmstays/[country]/[...path]` — do not remove `/listings?…`.

Host picker: country + chained children from `GET /api/locations/:id/children` + autocomplete + map. Do not require hosts to type lat/lng.

Launch data: architecture global; **do not** bulk-import the world. `isLaunchCountry` / env `DEFAULT_COUNTRY_CODE` (e.g. `IN`) gates publishing. Existing GCC seed data should still import so current listings map.

### 9.7 Implementation order (after this plan is approved)

| Step | Scope | This approval cycle |
|---|---|---|
| **Phase 1** | Prisma `Country`, `Location`, `LocationAlias`, `LocationTranslation`; nullable Listing FKs + coordinates; unique indexes; `prisma migrate`; no read-path switch | **Yes — after you approve** |
| Later | Backup taxonomy JSON; dry-run importer; listing mapping report | No |
| Later | Compatibility adapter; admin dual-write | No |
| Later | Location APIs + services | No |
| Later | Host picker, guest autocomplete, descendant search | No |
| Later | Nearby / map / SEO routes | No |
| Later | Drop JSON geo; stop using strings as source of truth | No |

Phase 1 will **not** change booking, Stripe, host calendar, or search behavior.

### 9.8 ER (target)

```
User 1──* Listing
Country 1──* Location
Country 1──* Listing
Location 1──* Location (parent)
Location 1──* Listing
Location 1──* LocationAlias
Location 1──* LocationTranslation

Listing.country / state / district     // denormalized names (kept)
Listing.payload                        // rooms, photos, mapEmbedUrl (kept)

PlatformCatalog.taxonomy               // stay-type filters remain;
                                       // geo arrays become a derived view then are removed
```

---

## 10. Migration risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Dual store (JSON + localStorage + Prisma strings) | Admin geo and listings can diverge today; a third store would make it worse | Phase 1 tables unused by UI; later adapter is the only geo editor; no new localStorage |
| Mixed catalog | Splitting geo out of `TaxonomyData` can break Filter tabs, mega-menu, quality rules | Keep stay-type JSON; project only geo arrays |
| Hard-coded `state` + `district` UI | Host/guest still have two geo dropdowns; 4–5 level trees cannot be edited | Schema allows depth now; UI catch-up is a later phase; adapter maps level 1/2 only |
| Name matching | `"Kochi"` vs `"Cochin"`; `"UAE"` vs `"United Arab Emirates"` | Hierarchy match (country → parent → child); aliases; unmatched → manual review, never auto-assign |
| Relabel vs IDs | Today rename rewrites listing **strings**. After IDs, rename must update denormalized names from the tree | Replace relabel with location-service update |
| `listingToFilterValues` name lookup | Edit form loses selection if names drift | After mapping, form uses `locationId` |
| GCC seed vs India launch | Seeds and guest geo are UAE-centric; `IN` is only a small preset | Import whatever is in live taxonomy; do not delete GCC; launch flag is data, not schema |
| `city` = district | Payload `city` is not a real city | Leave as-is until hosts pick a city node; then denormalize from breadcrumb |
| PostgreSQL NULL unique | Multiple `parentId NULL` + same name | `COALESCE` unique indexes |
| `prisma db push` vs migrate | Repo has no migrations history | Phase 1 introduces the first real migrate; review SQL; do not `db push` over production |
| Existing Listing rows | Adding required FKs would fail | All new FKs nullable |
| Demo mode | `requireActor` returns full admin in local demo | Mutations stay behind `requireAdmin`; demo must not be weaker in production (already `NODE_ENV` gated) |
| Search regression | Switching to IDs too early drops unmapped listings | Keep string filters until mapping report is clean; then `locationId IN descendants` **plus** fallback for `locationId IS NULL` |
| Currency / tax | Host pricing reads country **name** from taxonomy | Country table keeps `currencyCode`, `taxPct`, `exchangeRateToAed`; do not mix money refactor into this work |
| Nearby GEO_AREAS | Hardcoded Dubai/Hatta/… | Later replace with Location centroids; not Phase 1 |
| Google embed URLs | Quality rules may require `mapEmbedUrl` | Keep embed field; coordinates are additive |
| No tests | Easy to break listings search | Add Vitest in a later phase before switching search |
| Booking spine | Location work must not change confirm/pay/availability | Phase 1 is schema-only; later listing writes still populate name columns |
| Catalog ID stability | Taxonomy uses `c1` / `s1` / `d1` | Store `legacyTaxonomyId`; preserve where unique |

---

## Approval gate

**Please approve Phase 1** (schema only):

1. Add the Prisma models above.
2. Add nullable `Listing` location/coordinate columns and indexes.
3. Create a Prisma migration and review generated SQL.
4. Run `prisma migrate` against local Postgres (`farmstays` on `localhost:5432`) — no listing data rewrite.
5. Do not switch taxonomy GET, search, host form, or admin Countries onto the new tables yet.

After Phase 1 is merged and verified (existing `/listings`, host create, checkout unchanged), the next approval should be **taxonomy import (dry-run)** + mapping report — not the full API/UI surface.
