import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { HostCustomerRow, HostCustomersPage } from "@/lib/host/host-customers-types";

type CustomerAggRow = {
  guest_id: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  booking_count: number;
  enquiry_count: number;
  last_activity_at: Date;
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function normalizePageSize(pageSize?: number): number {
  if (!pageSize || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function safeSearchPrefix(value: string): string {
  return value.replace(/[%_]/g, "").trim();
}

export async function listHostCustomers(
  hostId: string,
  options?: { page?: number; pageSize?: number; q?: string }
): Promise<HostCustomersPage> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = normalizePageSize(options?.pageSize);
  const offset = (page - 1) * pageSize;
  const q = safeSearchPrefix(options?.q ?? "");

  const searchClause = q
    ? Prisma.sql`AND (
        COALESCE(gs.guest_name, '') ILIKE ${`${q}%`}
        OR COALESCE(gs.guest_email, '') ILIKE ${`${q}%`}
      )`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<CustomerAggRow[]>(Prisma.sql`
    WITH guest_stats AS (
      SELECT
        b."guestId" AS guest_id,
        MAX(u."fullName") AS guest_name,
        MAX(u.email) AS guest_email,
        MAX(u.phone) AS guest_phone,
        COUNT(*)::int AS booking_count,
        0::int AS enquiry_count,
        MAX(b."createdAt") AS last_activity_at
      FROM "Booking" b
      INNER JOIN "Listing" l ON l.id = b."listingId"
      INNER JOIN "User" u ON u.id = b."guestId"
      WHERE l."hostId" = ${hostId}
      GROUP BY b."guestId"

      UNION ALL

      SELECT
        e."guestId" AS guest_id,
        MAX(e."guestName") AS guest_name,
        MAX(e."guestEmail") AS guest_email,
        MAX(e."guestPhone") AS guest_phone,
        0::int AS booking_count,
        COUNT(*)::int AS enquiry_count,
        MAX(e."createdAt") AS last_activity_at
      FROM "EventAvailabilityRequest" e
      WHERE e."hostId" = ${hostId} AND e.status = 'available'
      GROUP BY e."guestId"
    ),
    grouped AS (
      SELECT
        guest_id,
        MAX(guest_name) AS guest_name,
        MAX(guest_email) AS guest_email,
        MAX(guest_phone) AS guest_phone,
        SUM(booking_count)::int AS booking_count,
        SUM(enquiry_count)::int AS enquiry_count,
        MAX(last_activity_at) AS last_activity_at
      FROM guest_stats
      GROUP BY guest_id
    )
    SELECT
      gs.guest_id,
      gs.guest_name,
      gs.guest_email,
      gs.guest_phone,
      gs.booking_count,
      gs.enquiry_count,
      gs.last_activity_at
    FROM grouped gs
    WHERE 1 = 1
    ${searchClause}
    ORDER BY gs.last_activity_at DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const countRows = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
    WITH guest_stats AS (
      SELECT
        b."guestId" AS guest_id,
        MAX(u."fullName") AS guest_name,
        MAX(u.email) AS guest_email
      FROM "Booking" b
      INNER JOIN "Listing" l ON l.id = b."listingId"
      INNER JOIN "User" u ON u.id = b."guestId"
      WHERE l."hostId" = ${hostId}
      GROUP BY b."guestId"

      UNION ALL

      SELECT
        e."guestId" AS guest_id,
        MAX(e."guestName") AS guest_name,
        MAX(e."guestEmail") AS guest_email
      FROM "EventAvailabilityRequest" e
      WHERE e."hostId" = ${hostId} AND e.status = 'available'
      GROUP BY e."guestId"
    ),
    grouped AS (
      SELECT
        guest_id,
        MAX(guest_name) AS guest_name,
        MAX(guest_email) AS guest_email
      FROM guest_stats
      GROUP BY guest_id
    )
    SELECT COUNT(*)::int AS total
    FROM grouped gs
    WHERE 1 = 1
    ${searchClause}
  `);

  const total = countRows[0]?.total ?? 0;

  const customers: HostCustomerRow[] = rows.map((row) => ({
    guestId: row.guest_id,
    guestName: row.guest_name?.trim() || "Guest",
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    bookingCount: row.booking_count,
    enquiryCount: row.enquiry_count,
    lastActivityAt: row.last_activity_at.toISOString(),
  }));

  return {
    customers,
    total,
    page,
    pageSize,
    hasMore: offset + customers.length < total,
  };
}
