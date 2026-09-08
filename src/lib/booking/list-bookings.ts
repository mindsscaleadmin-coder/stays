import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { catalogListingsForHost } from "@/lib/listings/catalog-listing-hosts";
import type { CheckInOutStatus, HostBookingRecord } from "@/lib/host/host-booking-types";
import type { GuestBookingSummary } from "@/lib/guest/guest-bookings-data";
import { formatAmount } from "@/lib/utils";
import type { HostBookingStatus } from "@/lib/mock/dashboard-data";
import { parseAuditLog } from "@/lib/booking/booking-audit";
import { mapDisputeStatus, mapRefundStatusFromRow } from "@/lib/booking/booking-ops";
import { BASE_CURRENCY, currencyForCountryName, normalizeCurrency } from "@/lib/currency";

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
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  photoUrl?: string;
} {
  try {
    const p = JSON.parse(payload) as {
      district?: string;
      country?: string;
      state?: string;
      city?: string;
      hostName?: string;
      currency?: string;
      photoUrls?: string[];
      coverImage?: string;
      img?: string;
    };
    const location = [p.city, p.district, p.state, p.country]
      .filter(Boolean)
      .filter((part, i, arr) => arr.indexOf(part) === i)
      .join(", ");
    return {
      location: location || undefined,
      hostName: p.hostName,
      currency: p.currency,
      country: p.country,
      state: p.state,
      district: p.district,
      city: p.city,
      photoUrl: p.photoUrls?.[0] || p.coverImage || p.img,
    };
  } catch {
    return {};
  }
}

function resolveBookingCurrency(
  meta: { currency?: string; country?: string },
  listingCountry?: string | null,
  pricingCurrency?: string | null
) {
  return normalizeCurrency(
    pricingCurrency ||
      meta.currency ||
      currencyForCountryName(listingCountry || meta.country) ||
      BASE_CURRENCY
  );
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
  bookingReference: string;
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
    propertyReference?: string | null;
    country?: string | null;
    state?: string | null;
    district?: string | null;
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

export function toHostBookingRecord(
  row: BookingRow,
  pricingCurrency?: string | null
): HostBookingRecord {
  const meta = parseListingPayload(row.listing.payload);
  const currency = resolveBookingCurrency(meta, row.listing.country, pricingCurrency);
  const checkIn = ymd(row.checkIn);
  const checkOut = row.checkOut ? ymd(row.checkOut) : checkIn;
  const nights = countNights(row.checkIn, row.checkOut);
  const listedNightly = row.listing.pricePerNight;
  const averageNightly =
    nights > 0 ? Math.round(row.totalPrice / nights) : row.totalPrice;
  const location =
    meta.location ||
    [row.listing.district, row.listing.state, row.listing.country]
      .filter(Boolean)
      .join(", ");

  return {
    id: row.id,
    bookingReference: row.bookingReference,
    listingId: row.listingId,
    hostId: row.listing.hostId,
    hostName: meta.hostName,
    guest: row.guest.fullName,
    guestEmail: row.guest.email || "",
    guestPhone: row.guest.phone || "",
    guestCountry: meta.country || row.listing.country || "",
    guestNotes: "",
    property: row.listing.title,
    propertyLocation: location || "",
    propertyReference: row.listing.propertyReference || undefined,
    roomType: "Entire place",
    checkIn,
    checkOut,
    nights,
    guests: row.guestCount,
    adults: Math.max(1, row.guestCount),
    children: 0,
    currency,
    nightlyRate: `${currency} ${formatAmount(listedNightly ?? averageNightly)}`,
    cleaningFee: `${currency} 0`,
    serviceFee: `${currency} 0`,
    total: `${currency} ${formatAmount(row.totalPrice)}`,
    averageNightlyTotal: `${currency} ${formatAmount(averageNightly)}`,
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

export function toGuestBookingSummary(
  row: BookingRow,
  pricingCurrency?: string | null
): GuestBookingSummary {
  const meta = parseListingPayload(row.listing.payload);
  const currency = resolveBookingCurrency(meta, row.listing.country, pricingCurrency);
  const img = meta.photoUrl || "";
  const location =
    meta.location ||
    [row.listing.district, row.listing.state, row.listing.country]
      .filter(Boolean)
      .join(", ");

  return {
    id: row.id,
    bookingReference: row.bookingReference,
    listingId: row.listingId,
    property: row.listing.title,
    location: location || "",
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
