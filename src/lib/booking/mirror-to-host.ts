import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { loadHostBookings, saveHostBookings } from "@/lib/host/host-booking-data";
import {
  getAvailabilitySettings,
  saveAvailabilitySettings,
} from "@/lib/host/host-availability-data";
import { countNights } from "@/lib/host/calculate-stay-price";
import { computePendingExpiresAt } from "@/lib/booking/policies";
import { formatAmount } from "@/lib/utils";
import { DISPLAY_DEFAULT_CURRENCY } from "@/lib/currency";

function nightsBetween(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const cursor = new Date(start);
  while (cursor < end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export type MirrorGuestBookingInput = {
  id: string;
  listingId: string;
  property: string;
  propertyLocation: string;
  guest: string;
  guestEmail: string;
  guestPhone?: string;
  guestId?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  currency: string;
  nightlyRate: number;
  status: "pending" | "confirmed";
  paymentStatus: string;
  roomType?: string;
  hostId?: string;
  policyId?: string;
  img?: string;
};

import { upsertGuestBooking } from "@/lib/guest/guest-bookings-data";

/** Push a guest booking into the host local bookings + block calendar dates when confirmed. */
export function mirrorGuestBookingToHost(input: MirrorGuestBookingInput): void {
  if (typeof window === "undefined") return;

  const nights = countNights(input.checkIn, input.checkOut);
  const currency = input.currency || DISPLAY_DEFAULT_CURRENCY;
  const expiresAt =
    input.status === "pending"
      ? computePendingExpiresAt().toISOString()
      : undefined;
  const record: HostBookingRecord = {
    id: input.id,
    listingId: input.listingId,
    hostId: input.hostId,
    guest: input.guest,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone || "",
    guestCountry: "",
    guestNotes: "Booked via guest checkout",
    property: input.property,
    propertyLocation: input.propertyLocation,
    roomType: input.roomType || "Entire place",
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    guests: input.guests,
    adults: input.guests,
    children: 0,
    nightlyRate: `${currency} ${formatAmount(input.nightlyRate)}`,
    cleaningFee: `${currency} 0`,
    serviceFee: `${currency} 0`,
    total: `${currency} ${formatAmount(input.total)}`,
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentStatus.toLowerCase().includes("paid")
      ? "Checkout"
      : "Pending",
    bookedAt: new Date().toISOString().slice(0, 10),
    status: input.status,
    expiresAt,
    policyId: input.policyId || "flexible",
    specialRequests: "",
    dietaryNeeds: "",
    checkInStatus: "pending",
    refundStatus: "none",
    disputeStatus: "none",
    noShow: false,
    auditLog: [
      {
        id: `audit-${input.id}-1`,
        at: new Date().toISOString(),
        actor: "Guest",
        action: input.status === "pending" ? "Booking requested" : "Booking confirmed",
        detail: `Checkout · ${input.paymentStatus}${
          expiresAt ? ` · respond by ${new Date(expiresAt).toLocaleString()}` : ""
        }`,
      },
    ],
  };

  const existing = loadHostBookings();
  if (!existing.some((b) => b.id === record.id)) {
    saveHostBookings([record, ...existing]);
  }

  if (input.status === "confirmed") {
    const settings = getAvailabilitySettings(input.listingId);
    const merged = Array.from(
      new Set([...settings.blockedDates, ...nightsBetween(input.checkIn, input.checkOut)])
    ).sort();
    saveAvailabilitySettings({ ...settings, blockedDates: merged });
  }

  upsertGuestBooking({
    id: input.id,
    listingId: input.listingId,
    property: input.property,
    location: input.propertyLocation,
    img: input.img || "",
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    status: input.status,
    total: `${currency} ${formatAmount(input.total)}`,
    bookedAt: new Date().toISOString().slice(0, 10),
    guestId: input.guestId,
  });
}
