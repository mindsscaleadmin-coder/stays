-- Experience session capacity slots + optional Booking.experienceSlotId

CREATE TABLE IF NOT EXISTS "ExperienceSlot" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExperienceSlot_listingId_date_sessionKey_key"
  ON "ExperienceSlot"("listingId", "date", "sessionKey");

CREATE INDEX IF NOT EXISTS "ExperienceSlot_listingId_date_idx"
  ON "ExperienceSlot"("listingId", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ExperienceSlot_listingId_fkey'
  ) THEN
    ALTER TABLE "ExperienceSlot"
      ADD CONSTRAINT "ExperienceSlot_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "experienceSlotId" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_experienceSlotId_idx"
  ON "Booking"("experienceSlotId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Booking_experienceSlotId_fkey'
  ) THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_experienceSlotId_fkey"
      FOREIGN KEY ("experienceSlotId") REFERENCES "ExperienceSlot"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
