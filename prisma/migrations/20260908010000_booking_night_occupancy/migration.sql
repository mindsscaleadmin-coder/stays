-- Occupancy lock for stay nights: one booking owns a listing-night.
-- Complements Listing FOR UPDATE in confirmBooking so concurrent checkouts
-- cannot both confirm the same dates under instant-book.

CREATE TABLE IF NOT EXISTS "BookingNight" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingNight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingNight_listingId_date_key"
  ON "BookingNight"("listingId", "date");

CREATE INDEX IF NOT EXISTS "BookingNight_bookingId_idx"
  ON "BookingNight"("bookingId");

CREATE INDEX IF NOT EXISTS "BookingNight_listingId_date_idx"
  ON "BookingNight"("listingId", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookingNight_listingId_fkey'
  ) THEN
    ALTER TABLE "BookingNight"
      ADD CONSTRAINT "BookingNight_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookingNight_bookingId_fkey'
  ) THEN
    ALTER TABLE "BookingNight"
      ADD CONSTRAINT "BookingNight_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill active stays so legacy confirmed/pending rows participate in the lock.
INSERT INTO "BookingNight" ("id", "listingId", "bookingId", "date")
SELECT
  'bn_' || substr(md5(b.id || d.day::text), 1, 24),
  b."listingId",
  b.id,
  (d.day::timestamp + interval '12 hours')
FROM "Booking" b
CROSS JOIN LATERAL generate_series(
  ((b."checkIn" AT TIME ZONE 'UTC')::date),
  (((COALESCE(b."checkOut", b."checkIn") AT TIME ZONE 'UTC')::date) - 1),
  '1 day'::interval
) AS d(day)
WHERE b.status IN ('pending', 'confirmed')
  AND b."checkOut" IS NOT NULL
  AND b."checkOut" > b."checkIn"
ON CONFLICT ("listingId", "date") DO NOTHING;
