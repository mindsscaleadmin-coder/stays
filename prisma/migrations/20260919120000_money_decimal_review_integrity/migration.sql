-- Money columns: DOUBLE PRECISION -> DECIMAL
ALTER TABLE "Listing"
  ALTER COLUMN "pricePerNight" TYPE DECIMAL(12, 2)
  USING ROUND("pricePerNight"::numeric, 2);

ALTER TABLE "Booking"
  ALTER COLUMN "totalPrice" TYPE DECIMAL(12, 2)
  USING ROUND("totalPrice"::numeric, 2);

ALTER TABLE "Booking"
  ALTER COLUMN "refundAmount" TYPE DECIMAL(12, 2)
  USING ROUND("refundAmount"::numeric, 2);

ALTER TABLE "ListingPromotion"
  ALTER COLUMN "priceAed" TYPE DECIMAL(12, 2)
  USING ROUND("priceAed"::numeric, 2);

ALTER TABLE "Country"
  ALTER COLUMN "exchangeRateToAed" TYPE DECIMAL(18, 6)
  USING "exchangeRateToAed"::numeric;

ALTER TABLE "Country"
  ALTER COLUMN "taxPct" TYPE DECIMAL(5, 2)
  USING ROUND("taxPct"::numeric, 2);

-- Review.bookingId -> Booking FK (nullable, set null on booking delete)
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_bookingId_fkey";
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Retain review / enquiry history when listing or users are removed
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_listingId_fkey";
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventAvailabilityRequest" DROP CONSTRAINT IF EXISTS "EventAvailabilityRequest_listingId_fkey";
ALTER TABLE "EventAvailabilityRequest"
  ADD CONSTRAINT "EventAvailabilityRequest_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventAvailabilityRequest" DROP CONSTRAINT IF EXISTS "EventAvailabilityRequest_hostId_fkey";
ALTER TABLE "EventAvailabilityRequest"
  ADD CONSTRAINT "EventAvailabilityRequest_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventAvailabilityRequest" DROP CONSTRAINT IF EXISTS "EventAvailabilityRequest_guestId_fkey";
ALTER TABLE "EventAvailabilityRequest"
  ADD CONSTRAINT "EventAvailabilityRequest_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
