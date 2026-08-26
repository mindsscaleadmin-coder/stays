import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { catalogListingsForHost } from "@/lib/listings/catalog-listing-hosts";
import type { CheckInOutStatus, HostBookingRecord } from "@/lib/host/host-booking-types";
import type { GuestBookingSummary } from "@/lib/guest/guest-bookings-data";
import { formatAmount } from "@/lib/utils";
import type { HostBookingStatus } from "@/lib/mock/dashboard-data";
import { parseAuditLog } from "@/lib/booking/booking-audit";
import { mapDisputeStatus, mapRefundStatusFromRow } from "@/lib/booking/booking-ops";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function countNights(checkIn: Date, checkOut: Date | null): number {
  if (!checkOut) return 1;
  const ms = checkOut.getTime() - checkIn.getTime();
  const nights = Math.round(ms / (24 * 60 * 60 * 1000));
  return Math.max(1, nights);
}

function parseListingPayload(payload: string): {
  location?: string;
  hostName?: string;
  currency?: string;
} {
  try {
    const p = JSON.parse(payload) as {
      district?: string;
      country?: string;
      state?: string;
      hostName?: string;
      currency?: string;
    };
    const location = [p.district, p.state, p.country].filter(Boolean).join(", ");
    return {
      location: location || undefined,
      hostName: p.hostName,
      currency: p.currency,
    };
  } catch {
    return {};
  }
}

function mapStatus(status: string): HostBookingStatus {
  const allowed: HostBookingStatus[] = [
    "pending",
    "confirmed",
    "declined",
    "completed",
    "cancelled",
    "expired",
  ];
  return (allowed.includes(status as HostBookingStatus)
    ? status
    : "pending") as HostBookingStatus;
}

function mapCheckInStatus(status: string): CheckInOutStatus {
  if (status === "checked_in" || status === "checked_out") return status;
  return "pending";
}

function paymentLabel(paymentStatus: string): string {
  const s = paymentStatus.toLowerCase();
  if (s === "paid") return "Paid";
  if (s === "unpaid") return "Unpaid";
  if (s.includes("refund")) return paymentStatus;
  return paymentStatus;
}

type BookingRow = {
  id: string;
  listingId: string;
  guestId: string;
  checkIn: Date;
  checkOut: Date | null;
  guestCount: number;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  expiresAt: Date | null;
  policyId: string;
  cancelledAt: Date | null;
  cancelReason: string | null;
  refundPercent: number | null;
  refundAmount: number | null;
  createdAt: Date;
  checkInStatus: string;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  disputeStatus: string;
  disputeSummary: string | null;
  disputeGuestClaim: string | null;
  disputeHostResponse: string | null;
  disputeResolution: string | null;
  disputeOpenedAt: Date | null;
  disputeResolvedAt: Date | null;
  noShow: boolean;
  auditLog: string;
  guest: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  listing: {
    id: string;
    hostId: string;
    title: string;
    payload: string;
    pricePerNight: number | null;
  };
};

const bookingInclude = {
  guest: true,
  listing: true,
} as const;

export async function listingIdsOwnedByHost(hostId: string): Promise<string[]> {
  const rows = await prisma.listing.findMany({
    where: { hostId },
    select: { id: true },
  });
  return Array.from(
    new Set([
      ...rows.map((row) => row.id),
      ...catalogListingsForHost(hostId).map((item) => item.listingId),
    ])
  );
}

export async function queryBookings(opts: {
  role: "host" | "guest";
  hostId?: string;
  guestId?: string;
  listingId?: string;
}): Promise<BookingRow[]> {
  let hostListingFilter: Prisma.BookingWhereInput = {};
  if (opts.role === "host" && opts.hostId) {
    const owned = await listingIdsOwnedByHost(opts.hostId);
    hostListingFilter =
      owned.length > 0
        ? { listingId: { in: owned } }
        : { listing: { hostId: opts.hostId } };
  }

  const where =
    opts.role === "guest"
      ? {
          ...(opts.guestId ? { guestId: opts.guestId } : {}),
          ...(opts.listingId ? { listingId: opts.listingId } : {}),
        }
      : {
          ...(opts.listingId ? { listingId: opts.listingId } : {}),
          ...hostListingFilter,
        };

  return prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function toHostBookingRecord(row: BookingRow): HostBookingRecord {
  const meta = parseListingPayload(row.listing.payload);
  const currency = meta.currency || "AED";
  const checkIn = ymd(row.checkIn);
  const checkOut = row.checkOut ? ymd(row.checkOut) : checkIn;
  const nights = countNights(row.checkIn, row.checkOut);
  const nightly =
    row.listing.pricePerNight ??
    (nights > 0 ? row.totalPrice / nights : row.totalPrice);

  return {
    id: row.id,
    listingId: row.listingId,
    hostId: row.listing.hostId,
    hostName: meta.hostName,
    guest: row.guest.fullName,
    guestEmail: row.guest.email || "",
    guestPhone: row.guest.phone || "",
    guestCountry: "",
    guestNotes: "",
    property: row.listing.title,
    propertyLocation: meta.location || "",
    roomType: "Entire place",
    checkIn,
    checkOut,
    nights,
    guests: row.guestCount,
    adults: row.guestCount,
    children: 0,
    nightlyRate: `${currency} ${formatAmount(nightly)}`,
    cleaningFee: `${currency} 0`,
    serviceFee: `${currency} 0`,
    total: `${currency} ${formatAmount(row.totalPrice)}`,
    paymentStatus: paymentLabel(row.paymentStatus),
    paymentMethod: row.paymentStatus.toLowerCase() === "paid" ? "Checkout" : "Pending",
    bookedAt: ymd(row.createdAt),
    status: mapStatus(row.status),
    expiresAt: row.expiresAt?.toISOString(),
    policyId: row.policyId || "flexible",
    specialRequests: "",
    dietaryNeeds: "",
    checkInStatus: mapCheckInStatus(row.checkInStatus),
    checkedInAt: row.checkedInAt?.toISOString(),
    checkedOutAt: row.checkedOutAt?.toISOString(),
    refundStatus: mapRefundStatusFromRow(row),
    refundAmount:
      row.refundAmount != null
        ? `${currency} ${formatAmount(row.refundAmount)}`
        : undefined,
    cancellationReason: row.cancelReason || undefined,
    cancelledAt: row.cancelledAt?.toISOString(),
    disputeStatus: mapDisputeStatus(row.disputeStatus),
    disputeSummary: row.disputeSummary || undefined,
    disputeGuestClaim: row.disputeGuestClaim || undefined,
    disputeHostResponse: row.disputeHostResponse || undefined,
    disputeResolution: row.disputeResolution || undefined,
    disputeOpenedAt: row.disputeOpenedAt?.toISOString(),
    disputeResolvedAt: row.disputeResolvedAt?.toISOString(),
    noShow: Boolean(row.noShow),
    auditLog: (() => {
      const log = parseAuditLog(row.auditLog);
      if (log.length > 0) return log;
      return [
        {
          id: `audit-${row.id}-created`,
          at: row.createdAt.toISOString(),
          actor: "System",
          action: "Booking created",
          detail: `${row.status} · ${row.paymentStatus}`,
        },
      ];
    })(),
  };
}

export function toGuestBookingSummary(row: BookingRow): GuestBookingSummary {
  const meta = parseListingPayload(row.listing.payload);
  const currency = meta.currency || "AED";
  let img = "";
  try {
    const p = JSON.parse(row.listing.payload) as { coverImage?: string; img?: string };
    img = p.coverImage || p.img || "";
  } catch {
    img = "";
  }

  return {
    id: row.id,
    listingId: row.listingId,
    property: row.listing.title,
    location: meta.location || "",
    img,
    checkIn: ymd(row.checkIn),
    checkOut: row.checkOut ? ymd(row.checkOut) : ymd(row.checkIn),
    status: row.status,
    total: `${currency} ${formatAmount(row.totalPrice)}`,
    bookedAt: ymd(row.createdAt),
    policyId: row.policyId || "flexible",
    paymentStatus: row.paymentStatus,
    totalPrice: row.totalPrice,
    guestId: row.guestId,
  };
}
