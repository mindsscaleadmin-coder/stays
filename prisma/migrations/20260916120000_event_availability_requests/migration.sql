-- One row per directory listing availability enquiry (replaces shared PlatformCatalog JSON blob).

CREATE TABLE IF NOT EXISTS "EventAvailabilityRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingTitle" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "spaceId" TEXT,
    "spaceName" TEXT,
    "occasion" TEXT,
    "partyType" TEXT,
    "eventDate" TEXT,
    "dateFlexible" BOOLEAN NOT NULL DEFAULT false,
    "guestCount" INTEGER NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "hostNote" TEXT,

    CONSTRAINT "EventAvailabilityRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventAvailabilityRequest_hostId_createdAt_idx"
  ON "EventAvailabilityRequest"("hostId", "createdAt");

CREATE INDEX IF NOT EXISTS "EventAvailabilityRequest_guestId_createdAt_idx"
  ON "EventAvailabilityRequest"("guestId", "createdAt");

CREATE INDEX IF NOT EXISTS "EventAvailabilityRequest_guestId_listingId_idx"
  ON "EventAvailabilityRequest"("guestId", "listingId");

CREATE INDEX IF NOT EXISTS "EventAvailabilityRequest_listingId_status_idx"
  ON "EventAvailabilityRequest"("listingId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "EventAvailabilityRequest_pending_guest_listing_date_key"
  ON "EventAvailabilityRequest"("guestId", "listingId", COALESCE("eventDate", ''), "dateFlexible")
  WHERE "status" = 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EventAvailabilityRequest_listingId_fkey'
  ) THEN
    ALTER TABLE "EventAvailabilityRequest"
      ADD CONSTRAINT "EventAvailabilityRequest_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EventAvailabilityRequest_hostId_fkey'
  ) THEN
    ALTER TABLE "EventAvailabilityRequest"
      ADD CONSTRAINT "EventAvailabilityRequest_hostId_fkey"
      FOREIGN KEY ("hostId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EventAvailabilityRequest_guestId_fkey'
  ) THEN
    ALTER TABLE "EventAvailabilityRequest"
      ADD CONSTRAINT "EventAvailabilityRequest_guestId_fkey"
      FOREIGN KEY ("guestId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Migrate legacy JSON array from PlatformCatalog into individual rows.
DO $$
DECLARE
  raw_payload TEXT;
  elem JSONB;
BEGIN
  SELECT payload INTO raw_payload
  FROM "PlatformCatalog"
  WHERE key = 'event-availability-requests';

  IF raw_payload IS NULL OR raw_payload = '' OR raw_payload = '[]' THEN
    RETURN;
  END IF;

  FOR elem IN SELECT * FROM jsonb_array_elements(raw_payload::jsonb)
  LOOP
    -- Skip orphaned demo rows that never had matching Listing/User records.
    IF NOT EXISTS (SELECT 1 FROM "Listing" WHERE id = elem->>'listingId') THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE id = elem->>'hostId') THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE id = elem->>'guestId') THEN
      CONTINUE;
    END IF;

    INSERT INTO "EventAvailabilityRequest" (
      "id",
      "listingId",
      "listingTitle",
      "hostId",
      "guestId",
      "guestName",
      "guestEmail",
      "guestPhone",
      "spaceId",
      "spaceName",
      "occasion",
      "partyType",
      "eventDate",
      "dateFlexible",
      "guestCount",
      "message",
      "status",
      "createdAt",
      "respondedAt",
      "hostNote"
    ) VALUES (
      elem->>'id',
      elem->>'listingId',
      COALESCE(elem->>'listingTitle', ''),
      elem->>'hostId',
      elem->>'guestId',
      COALESCE(elem->>'guestName', 'Guest'),
      NULLIF(elem->>'guestEmail', ''),
      NULLIF(elem->>'guestPhone', ''),
      NULLIF(elem->>'spaceId', ''),
      NULLIF(elem->>'spaceName', ''),
      NULLIF(elem->>'occasion', ''),
      NULLIF(elem->>'partyType', ''),
      NULLIF(elem->>'eventDate', ''),
      COALESCE((elem->>'dateFlexible')::boolean, false),
      COALESCE((elem->>'guestCount')::int, 1),
      NULLIF(elem->>'message', ''),
      COALESCE(elem->>'status', 'pending'),
      COALESCE((elem->>'createdAt')::timestamptz, CURRENT_TIMESTAMP),
      CASE
        WHEN elem->>'respondedAt' IS NULL OR elem->>'respondedAt' = '' THEN NULL
        ELSE (elem->>'respondedAt')::timestamptz
      END,
      NULLIF(elem->>'hostNote', '')
    )
    ON CONFLICT ("id") DO NOTHING;
  END LOOP;
END $$;
