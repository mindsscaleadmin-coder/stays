-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "fullName" TEXT NOT NULL,
    "roles" TEXT NOT NULL DEFAULT '["guest"]',
    "language" TEXT NOT NULL DEFAULT 'en',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "parentCategory" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "subcategory" TEXT NOT NULL DEFAULT '',
    "maxGuests" INTEGER NOT NULL DEFAULT 4,
    "pricePerNight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPricing" (
    "listingId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPricing_pkey" PRIMARY KEY ("listingId")
);

-- CreateTable
CREATE TABLE "ListingAvailabilityMeta" (
    "listingId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingAvailabilityMeta_pkey" PRIMARY KEY ("listingId")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3),
    "guestCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "expiresAt" TIMESTAMP(3),
    "policyId" TEXT NOT NULL DEFAULT 'flexible',
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "refundPercent" INTEGER,
    "refundAmount" DOUBLE PRECISION,
    "stripeSessionId" TEXT,
    "stripeRefundId" TEXT,
    "checkInStatus" TEXT NOT NULL DEFAULT 'pending',
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "disputeStatus" TEXT NOT NULL DEFAULT 'none',
    "disputeSummary" TEXT,
    "disputeGuestClaim" TEXT,
    "disputeHostResponse" TEXT,
    "disputeResolution" TEXT,
    "disputeOpenedAt" TIMESTAMP(3),
    "disputeResolvedAt" TIMESTAMP(3),
    "noShow" BOOLEAN NOT NULL DEFAULT false,
    "auditLog" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostProfile" (
    "hostId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostProfile_pkey" PRIMARY KEY ("hostId")
);

-- CreateTable
CREATE TABLE "BookingMessage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPromotion" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceAed" DOUBLE PRECISION NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "paymentRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCatalogSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionCatalogSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustCatalogSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustCatalogSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCatalog" (
    "key" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCatalog_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "HostTrust" (
    "hostId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostTrust_pkey" PRIMARY KEY ("hostId")
);

-- CreateTable
CREATE TABLE "HostReviewsMeta" (
    "hostId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostReviewsMeta_pkey" PRIMARY KEY ("hostId")
);

-- CreateTable
CREATE TABLE "HostStaff" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostNotifications" (
    "hostId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostNotifications_pkey" PRIMARY KEY ("hostId")
);

-- CreateTable
CREATE TABLE "HostAddons" (
    "hostId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostAddons_pkey" PRIMARY KEY ("hostId")
);

-- CreateTable
CREATE TABLE "HostAnalytics" (
    "hostId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostAnalytics_pkey" PRIMARY KEY ("hostId")
);

-- CreateTable
CREATE TABLE "HostAccounts" (
    "hostId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostAccounts_pkey" PRIMARY KEY ("hostId")
);

-- CreateTable
CREATE TABLE "PlatformStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "bookingId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Listing_hostId_idx" ON "Listing"("hostId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_featured_idx" ON "Listing"("featured");

-- CreateIndex
CREATE INDEX "Listing_status_country_idx" ON "Listing"("status", "country");

-- CreateIndex
CREATE INDEX "Listing_status_parentCategory_idx" ON "Listing"("status", "parentCategory");

-- CreateIndex
CREATE INDEX "Listing_country_state_district_idx" ON "Listing"("country", "state", "district");

-- CreateIndex
CREATE INDEX "Listing_parentCategory_category_subcategory_idx" ON "Listing"("parentCategory", "category", "subcategory");

-- CreateIndex
CREATE INDEX "Availability_listingId_date_idx" ON "Availability"("listingId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_listingId_date_key" ON "Availability"("listingId", "date");

-- CreateIndex
CREATE INDEX "Booking_listingId_checkIn_checkOut_idx" ON "Booking"("listingId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Booking_guestId_status_idx" ON "Booking"("guestId", "status");

-- CreateIndex
CREATE INDEX "Booking_listingId_status_idx" ON "Booking"("listingId", "status");

-- CreateIndex
CREATE INDEX "BookingMessage_bookingId_createdAt_idx" ON "BookingMessage"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingPromotion_listingId_kind_status_idx" ON "ListingPromotion"("listingId", "kind", "status");

-- CreateIndex
CREATE INDEX "ListingPromotion_kind_status_endsAt_idx" ON "ListingPromotion"("kind", "status", "endsAt");

-- CreateIndex
CREATE INDEX "HostStaff_email_idx" ON "HostStaff"("email");

-- CreateIndex
CREATE INDEX "HostStaff_hostId_idx" ON "HostStaff"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "HostStaff_hostId_email_key" ON "HostStaff"("hostId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformStaff_email_key" ON "PlatformStaff"("email");

-- CreateIndex
CREATE INDEX "PlatformStaff_role_idx" ON "PlatformStaff"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_listingId_status_idx" ON "Review"("listingId", "status");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPricing" ADD CONSTRAINT "ListingPricing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAvailabilityMeta" ADD CONSTRAINT "ListingAvailabilityMeta_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostProfile" ADD CONSTRAINT "HostProfile_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPromotion" ADD CONSTRAINT "ListingPromotion_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostTrust" ADD CONSTRAINT "HostTrust_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostReviewsMeta" ADD CONSTRAINT "HostReviewsMeta_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostStaff" ADD CONSTRAINT "HostStaff_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostNotifications" ADD CONSTRAINT "HostNotifications_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostAddons" ADD CONSTRAINT "HostAddons_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostAnalytics" ADD CONSTRAINT "HostAnalytics_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostAccounts" ADD CONSTRAINT "HostAccounts_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

