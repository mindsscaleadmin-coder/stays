-- Short property code for guest, host, and support communication.
ALTER TABLE "Listing" ADD COLUMN "propertyReference" TEXT;

UPDATE "Listing"
SET "propertyReference" = 'FS-P-' || UPPER(SUBSTRING(MD5("id"), 1, 8));

ALTER TABLE "Listing" ALTER COLUMN "propertyReference" SET NOT NULL;
CREATE UNIQUE INDEX "Listing_propertyReference_key" ON "Listing"("propertyReference");
