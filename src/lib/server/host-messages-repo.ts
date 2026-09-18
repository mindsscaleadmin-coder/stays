import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { HostMessageInboxRow, HostMessagesInboxPage } from "@/lib/host/host-messages-types";

type InboxRow = {
  booking_id: string;
  booking_reference: string;
  guest_name: string;
  property: string;
  check_in: Date;
  last_message_body: string;
  last_message_at: Date;
  last_sender_role: string;
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function normalizePageSize(pageSize?: number): number {
  if (!pageSize || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function listHostMessageInbox(
  hostId: string,
  options?: { page?: number; pageSize?: number }
): Promise<HostMessagesInboxPage> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = normalizePageSize(options?.pageSize);
  const offset = (page - 1) * pageSize;

  const rows = await prisma.$queryRaw<InboxRow[]>(Prisma.sql`
    WITH latest AS (
      SELECT
        bm."bookingId" AS booking_id,
        MAX(bm."createdAt") AS last_message_at
      FROM "BookingMessage" bm
      INNER JOIN "Booking" b ON b.id = bm."bookingId"
      INNER JOIN "Listing" l ON l.id = b."listingId"
      WHERE l."hostId" = ${hostId}
      GROUP BY bm."bookingId"
    )
    SELECT
      b.id AS booking_id,
      b."bookingReference" AS booking_reference,
      u."fullName" AS guest_name,
      l.title AS property,
      b."checkIn" AS check_in,
      bm.body AS last_message_body,
      bm."createdAt" AS last_message_at,
      bm."senderRole" AS last_sender_role
    FROM latest
    INNER JOIN "BookingMessage" bm
      ON bm."bookingId" = latest.booking_id AND bm."createdAt" = latest.last_message_at
    INNER JOIN "Booking" b ON b.id = latest.booking_id
    INNER JOIN "Listing" l ON l.id = b."listingId"
    INNER JOIN "User" u ON u.id = b."guestId"
    ORDER BY latest.last_message_at DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const countRows = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT bm."bookingId")::int AS total
    FROM "BookingMessage" bm
    INNER JOIN "Booking" b ON b.id = bm."bookingId"
    INNER JOIN "Listing" l ON l.id = b."listingId"
    WHERE l."hostId" = ${hostId}
  `);

  const total = countRows[0]?.total ?? 0;

  const threads: HostMessageInboxRow[] = rows.map((row) => ({
    bookingId: row.booking_id,
    bookingReference: row.booking_reference,
    guestName: row.guest_name,
    property: row.property,
    checkIn: ymd(row.check_in),
    lastMessageBody: row.last_message_body,
    lastMessageAt: row.last_message_at.toISOString(),
    lastSenderRole: row.last_sender_role,
  }));

  return {
    threads,
    total,
    page,
    pageSize,
    hasMore: offset + threads.length < total,
  };
}
