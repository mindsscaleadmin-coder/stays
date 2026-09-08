import type { AdminUserRecord } from "./user-types";
import { loadAllSupportTickets, loadGuestTicketsFlat } from "./support-data";
import type { SupportTicketStatus } from "@/lib/host/host-support-types";
import { GUEST_BOOKINGS } from "@/lib/mock/guest-data";
import { HOST_BOOKINGS } from "@/lib/mock/dashboard-data";
import {
  loadGuestBookings,
  type GuestBookingSummary,
} from "@/lib/guest/guest-bookings-data";
import { getGuestVerification } from "@/lib/guest/guest-verification-data";
import type { GuestVerificationRequest } from "@/lib/guest/guest-verification-types";
import { loadGuestAccountSettings } from "@/lib/guest/guest-account-settings";
import { loadHostBookings } from "@/lib/host/host-booking-data";

/** Seed guest → known demo booking ids (admin ID → trip). */
const SEED_GUEST_BOOKING_IDS: Record<string, string[]> = {
  "U-004": ["GF-A8K2X1"],
  "U-002": ["GF-L3P8R5"],
};

export function demoGuestIdFromEmail(email: string): string {
  const stable = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `demo-${stable || "guest"}`;
}

/** Possible keys used for guest-scoped storage / APIs. */
export function resolveGuestKeys(user: AdminUserRecord): string[] {
  const keys = new Set<string>([user.id]);
  if (user.email) {
    keys.add(demoGuestIdFromEmail(user.email));
    keys.add(user.email.trim().toLowerCase());
  }
  return Array.from(keys);
}

function emailsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return true;
  // priya@example.com ↔ priya.sharma@example.com
  const localA = na.split("@")[0]?.replace(/\./g, "") ?? "";
  const localB = nb.split("@")[0]?.replace(/\./g, "") ?? "";
  const domainA = na.split("@")[1] ?? "";
  const domainB = nb.split("@")[1] ?? "";
  return Boolean(localA && localB && domainA === domainB && (localA.includes(localB) || localB.includes(localA)));
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function toSummaryFromHost(b: {
  id: string;
  property: string;
  propertyLocation: string;
  checkIn: string;
  checkOut: string;
  status: string;
  total: string;
  bookedAt: string;
  listingId?: string;
}): GuestBookingSummary {
  return {
    id: b.id,
    listingId: b.listingId || "1",
    property: b.property,
    location: b.propertyLocation,
    img: "",
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
    total: b.total,
    bookedAt: b.bookedAt,
  };
}

function toSummaryFromSeed(b: (typeof GUEST_BOOKINGS)[number]): GuestBookingSummary {
  return {
    id: b.id,
    listingId: (b as { listingId?: string }).listingId || "1",
    property: b.property,
    location: b.location,
    img: b.img,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
    total: b.total,
    bookedAt: b.checkIn,
  };
}

/** Trips associated with this guest (host store, local guest store, seeds). */
export function bookingsForGuest(user: AdminUserRecord): GuestBookingSummary[] {
  const keys = new Set(resolveGuestKeys(user));
  const seedIds = new Set(SEED_GUEST_BOOKING_IDS[user.id] ?? []);
  const map = new Map<string, GuestBookingSummary>();

  for (const b of HOST_BOOKINGS) {
    if (
      namesMatch(b.guest, user.name) ||
      emailsMatch(b.guestEmail, user.email) ||
      seedIds.has(b.id)
    ) {
      map.set(b.id, toSummaryFromHost(b));
    }
  }

  try {
    for (const b of loadHostBookings()) {
      if (
        namesMatch(b.guest, user.name) ||
        emailsMatch(b.guestEmail, user.email) ||
        seedIds.has(b.id)
      ) {
        map.set(b.id, toSummaryFromHost(b));
      }
    }
  } catch {
    // SSR / unavailable
  }

  try {
    for (const b of loadGuestBookings()) {
      if (b.guestId && keys.has(b.guestId)) {
        map.set(b.id, b);
      }
    }
  } catch {
    // SSR / unavailable
  }

  for (const b of GUEST_BOOKINGS) {
    if (seedIds.has(b.id) && !map.has(b.id)) {
      map.set(b.id, toSummaryFromSeed(b));
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()
  );
}

function mapTicketStatus(status: string): SupportTicketStatus {
  if (status === "escalated") return "in_progress";
  if (status === "closed") return "resolved";
  if (status === "in_progress" || status === "resolved") return status;
  return "open";
}

export function ticketsForGuest(user: AdminUserRecord) {
  const keys = resolveGuestKeys(user);
  const byId = new Map<string, ReturnType<typeof loadGuestTicketsFlat>[number]>();
  for (const key of keys) {
    for (const t of loadGuestTicketsFlat(key)) {
      byId.set(t.id, t);
    }
  }
  for (const t of loadAllSupportTickets()) {
    if (t.source !== "guest") continue;
    if (
      keys.includes(t.requesterId) ||
      emailsMatch(t.requesterEmail, user.email) ||
      namesMatch(t.requesterName, user.name)
    ) {
      byId.set(t.id, {
        id: t.id,
        subject: t.subject,
        message: t.message,
        status: mapTicketStatus(t.status),
        createdAt: t.createdAt,
        bookingRef: t.bookingRef,
        property: t.property,
      });
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function findGuestVerificationLocal(
  user: AdminUserRecord
): GuestVerificationRequest | null {
  for (const key of resolveGuestKeys(user)) {
    const found = getGuestVerification(key);
    if (found) return found;
  }
  return null;
}

export function accountSettingsForGuest(user: AdminUserRecord) {
  for (const key of resolveGuestKeys(user)) {
    const settings = loadGuestAccountSettings(key);
    // Prefer non-default if any key has been customized
    if (!settings.emailNotifications || settings.smsNotifications) {
      return settings;
    }
  }
  return loadGuestAccountSettings(user.id);
}
