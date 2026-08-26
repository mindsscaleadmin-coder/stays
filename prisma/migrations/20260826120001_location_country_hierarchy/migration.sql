-- Location Phase 1: normalized Country/Location tree.
-- Does not rewrite listing name columns or map existing rows.
-- All new Listing FKs/coordinates are nullable so the  existing listings stay valid.

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officialName" TEXT,
    "iso2" TEXT NOT NULL,
    "iso3" TEXT,
    "numericCode" TEXT,
    "phoneCode" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'AED',
    "currencySymbol" TEXT,
    "exchangeRateToAed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "taxPct" DOUBLE PRECISION,
    "taxLabel" TEXT,
    "flag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLaunchCountry" BOOLEAN NOT NULL DEFAULT false,
    "comingSoon" BOOLEAN NOT NULL DEFAULT false,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "propertyPublishingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "legacyTaxonomyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "code" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "timezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "legacyTaxonomyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationAlias" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationTranslation" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationTranslation_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "countryId" TEXT,
ADD COLUMN "locationId" TEXT,
ADD COLUMN "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7),
ADD COLUMN "address" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "timezone" TEXT,
ADD COLUMN "showExactLocation" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Country_iso2_key" ON "Country"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "Country_legacyTaxonomyId_key" ON "Country"("legacyTaxonomyId");

-- CreateIndex
CREATE INDEX "Country_isActive_isLaunchCountry_idx" ON "Country"("isActive", "isLaunchCountry");

-- CreateIndex
CREATE INDEX "Location_countryId_parentId_idx" ON "Location"("countryId", "parentId");

-- CreateIndex
CREATE INDEX "Location_countryId_type_idx" ON "Location"("countryId", "type");

-- CreateIndex
CREATE INDEX "Location_countryId_slug_idx" ON "Location"("countryId", "slug");

-- CreateIndex
CREATE INDEX "Location_normalizedName_idx" ON "Location"("normalizedName");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");

-- CreateIndex
CREATE INDEX "Location_legacyTaxonomyId_idx" ON "Location"("legacyTaxonomyId");

-- Duplicate names are allowed across parents. PostgreSQL UNIQUE treats NULL
-- parentId as distinct, so COALESCE is required for top-level siblings.
CREATE UNIQUE INDEX "location_sibling_name_uidx"
  ON "Location" ("countryId", COALESCE("parentId", ''), "normalizedName");

CREATE UNIQUE INDEX "location_sibling_slug_uidx"
  ON "Location" ("countryId", COALESCE("parentId", ''), "slug");

-- CreateIndex
CREATE INDEX "LocationAlias_normalizedAlias_idx" ON "LocationAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "LocationAlias_locationId_idx" ON "LocationAlias"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationAlias_locationId_normalizedAlias_languageCode_key" ON "LocationAlias"("locationId", "normalizedAlias", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "LocationTranslation_locationId_languageCode_key" ON "LocationTranslation"("locationId", "languageCode");

-- CreateIndex
CREATE INDEX "Listing_countryId_status_idx" ON "Listing"("countryId", "status");

-- CreateIndex
CREATE INDEX "Listing_locationId_status_idx" ON "Listing"("locationId", "status");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationAlias" ADD CONSTRAINT "LocationAlias_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTranslation" ADD CONSTRAINT "LocationTranslation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
