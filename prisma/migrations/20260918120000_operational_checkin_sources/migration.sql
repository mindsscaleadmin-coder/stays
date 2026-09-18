-- Track whether check-in/out was automatic or manual
ALTER TABLE "Booking" ADD COLUMN "checkInSource" TEXT;
ALTER TABLE "Booking" ADD COLUMN "checkOutSource" TEXT;
