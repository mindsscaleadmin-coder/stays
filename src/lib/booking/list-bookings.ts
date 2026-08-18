import { prisma } from "@/lib/prisma";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { GuestBookingSummary } from "@/lib/guest/guest-bookings-data";
import { formatAmount } from "@/lib/utils";
import type { HostBookingStatus } from "@/lib/mock/dashboard-data";

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

export async function queryBookings(opts: {
  role: "host" | "guest";
  hostId?: string;
  guestId?: string;
  listingId?: string;
}): Promise<BookingRow[]> {
  const where =
    opts.role === "guest"
      ? {
          ...(opts.guestId ? { guestId: opts.guestId } : {}),
          ...(opts.listingId ? { listingId: opts.listingId } : {}),
        }
      : {
          ...(opts.listingId ? { listingId: opts.listingId } : {}),
          ...(opts.hostId ? { listing: { hostId: opts.hostId } } : {}),
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
    checkInStatus: "pending",
    refundStatus:
      row.refundPercent != null && row.refundPercent >= 100
        ? "full"
        : row.refundPercent != null && row.refundPercent > 0
          ? "partial"
          : "none",
    refundAmount:
      row.refundAmount != null
        ? `${currency} ${formatAmount(row.refundAmount)}`
        : undefined,
    cancellationReason: row.cancelReason || undefined,
    cancelledAt: row.cancelledAt?.toISOString(),
    disputeStatus: "none",
    noShow: false,
    auditLog: [
      {
        id: `audit-${row.id}-server`,
        at: row.createdAt.toISOString(),
        actor: "System",
        action: "Loaded from server",
        detail: `${row.status} · ${row.paymentStatus}`,
      },
    ],
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
