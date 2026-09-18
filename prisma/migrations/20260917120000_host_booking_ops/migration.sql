-- Host booking operations metadata (staff assignment, private notes, manual completion).

CREATE TABLE "HostBookingOps" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "privateNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostBookingOps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HostBookingOps_sourceType_sourceId_key" ON "HostBookingOps"("sourceType", "sourceId");

CREATE INDEX "HostBookingOps_hostId_idx" ON "HostBookingOps"("hostId");

CREATE INDEX "HostBookingOps_hostId_assignedStaffId_idx" ON "HostBookingOps"("hostId", "assignedStaffId");

ALTER TABLE "HostBookingOps" ADD CONSTRAINT "HostBookingOps_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostBookingOps" ADD CONSTRAINT "HostBookingOps_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "HostStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
