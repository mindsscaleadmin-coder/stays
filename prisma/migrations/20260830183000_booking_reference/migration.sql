-- Human-readable reference shared by guests, hosts, and support.
ALTER TABLE "Booking" ADD COLUMN "bookingReference" TEXT;

-- Preserve existing bookings with a stable reference derived from their immutable id.
UPDATE "Booking"
SET "bookingReference" = 'FS-' || UPPER(SUBSTRING(MD5("id"), 1, 8));

ALTER TABLE "Booking" ALTER COLUMN "bookingReference" SET NOT NULL;
CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "Booking"("bookingReference");
