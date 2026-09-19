import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { HostMessageInboxRow, HostMessagesInboxPage } from "@/lib/host/host-messages-types";

type InboxRow = {
  booking_id: string;
  booking_reference: string;
  guest_name: string;
  guest_email: string | null;
  property: string;
  listing_payload: string | null;
  check_in: Date;
  check_out: Date | null;
  guest_count: number | null;
  booking_status: string | null;
  check_in_status: string | null;
  last_message_body: string;
  last_message_at: Date;
  last_sender_role: string;
  last_sender_name: string | null;
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

function extractPhotoUrl(payloadStr?: string | null): string | undefined {
  if (!payloadStr) return undefined;
  try {
    const p = JSON.parse(payloadStr) as {
      photoUrls?: string[];
      coverImage?: string;
      img?: string;
    };
    return p.photoUrls?.[0] || p.coverImage || p.img || undefined;
  } catch {
    return undefined;
  }
}

export async function listHostMessageInbox(
  hostId: string,
  options?: { page?: number; pageSize?: number }
): Promise<HostMessagesInboxPage> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = normalizePageSize(options?.pageSize);
  const offset = (page - 1) * pageSize;

  const rows = await prisma.$queryRaw<InboxRow[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        bm."bookingId" AS booking_id,
        bm.body AS last_message_body,
        bm."createdAt" AS last_message_at,
        bm."senderRole" AS last_sender_role,
        bm."senderName" AS last_sender_name,
        ROW_NUMBER() OVER (
          PARTITION BY bm."bookingId"
          ORDER BY bm."createdAt" DESC, bm.id DESC
        ) AS rn
      FROM "BookingMessage" bm
      INNER JOIN "Booking" b ON b.id = bm."bookingId"
      INNER JOIN "Listing" l ON l.id = b."listingId"
      WHERE l."hostId" = ${hostId}
    )
    SELECT
      b.id AS booking_id,
      b."bookingReference" AS booking_reference,
      u."fullName" AS guest_name,
      u.email AS guest_email,
      l.title AS property,
      l.payload AS listing_payload,
      b."checkIn" AS check_in,
      b."checkOut" AS check_out,
      b."guestCount" AS guest_count,
      b.status AS booking_status,
      b."checkInStatus" AS check_in_status,
      r.last_message_body,
      r.last_message_at,
      r.last_sender_role,
      r.last_sender_name
    FROM ranked r
    INNER JOIN "Booking" b ON b.id = r.booking_id
    INNER JOIN "Listing" l ON l.id = b."listingId"
    INNER JOIN "User" u ON u.id = b."guestId"
    WHERE r.rn = 1
    ORDER BY r.last_message_at DESC
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
    guestEmail: row.guest_email || undefined,
    property: row.property,
    propertyPhoto: extractPhotoUrl(row.listing_payload),
    checkIn: ymd(row.check_in),
    checkOut: row.check_out ? ymd(row.check_out) : undefined,
    guestCount: row.guest_count ?? undefined,
    bookingStatus: row.booking_status ?? undefined,
    checkInStatus: row.check_in_status ?? undefined,
    lastMessageBody: row.last_message_body,
    lastMessageAt: row.last_message_at.toISOString(),
    lastSenderRole: row.last_sender_role,
    lastSenderName: row.last_sender_name || undefined,
  }));

  return {
    threads,
    total,
    page,
    pageSize,
    hasMore: offset + threads.length < total,
  };
}
