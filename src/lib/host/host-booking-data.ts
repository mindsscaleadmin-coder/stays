import { HOST_BOOKINGS, type HostBooking } from "@/lib/mock/dashboard-data";
import { resolveBookingHost } from "@/lib/admin/booking-oversight-utils";
import type {
  BookingAuditEntry,
  HostBookingRecord,
  HostBookingUpdate,
} from "./host-booking-types";
import {
  defaultCheckInStatus,
  defaultRefundStatus,
} from "./host-booking-utils";

import { emitSyncEvent } from "@/lib/emit-sync-event";
import { isSharedDbEnabled } from "@/lib/shared-db";
import {
  computePendingExpiresAt,
  evaluateCancellationRefund,
  isPendingExpired,
  PENDING_RESPONSE_HOURS,
  refundStatusFromBand,
} from "@/lib/booking/policies";
import { updateGuestBookingStatus } from "@/lib/guest/guest-bookings-data";
import { LAUNCH_CURRENCY } from "@/lib/tax/launch-market";
const BOOKINGS_KEY = "farm-stays-host-bookings";
const INSTANT_BOOK_KEY = "farm-stays-host-instant-book-enabled";
export const HOST_BOOKINGS_SYNC_EVENT = "farm-stays-host-bookings-updated";
export { PENDING_RESPONSE_HOURS };

const SEED_ENRICHMENTS: Partial<
  Record<
    string,
    Partial<
      Pick<
        HostBookingRecord,
        | "specialRequests"
        | "dietaryNeeds"
        | "checkInStatus"
        | "refundStatus"
        | "refundAmount"
        | "disputeStatus"
        | "disputeSummary"
        | "disputeGuestClaim"
        | "disputeHostResponse"
        | "disputeResolution"
        | "disputeOpenedAt"
        | "disputeResolvedAt"
        | "noShow"
        | "auditLog"
      >
    >
  >
> = {
  "GF-A8K2X1": {
    specialRequests: "Prefer ground-floor rooms. Arriving around 4 PM.",
    dietaryNeeds: "Vegetarian meals for 2 guests",
    checkInStatus: "pending",
    refundStatus: "none",
    disputeStatus: "open",
    disputeSummary: "Guest claims room photos do not match listing",
    disputeGuestClaim:
      "Pool area shown in photos was closed for maintenance. Requesting partial refund.",
    disputeHostResponse: "Pool maintenance was communicated 48 hours before arrival.",
    disputeOpenedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    auditLog: [
      {
        id: "audit-gf-a8k-1",
        at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "Guest",
        action: "Dispute opened",
        detail: "Room not as described — pool unavailable",
      },
    ],
  },
  "GF-H2K9M1": {
    specialRequests: "Celebrating a family gathering. Need barbecue access.",
    dietaryNeeds: "No pork; one guest is allergic to nuts",
    checkInStatus: "pending",
    refundStatus: "none",
  },
  "GF-J4N2P8": {
    specialRequests: "Quiet stay preferred. Late checkout if possible.",
    dietaryNeeds: "Halal only",
    checkInStatus: "pending",
    refundStatus: "none",
  },
  "GF-K7M1Q3": {
    checkInStatus: "checked_out",
    refundStatus: "none",
  },
  "GF-L3P8R5": {
    specialRequests: "Cancelled due to travel change.",
    checkInStatus: "pending",
    refundStatus: "full",
    refundAmount: "INR 2,280",
    disputeStatus: "resolved",
    disputeSummary: "Refund amount disagreement",
    disputeResolution: "Full refund issued per cancellation policy.",
    disputeResolvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    auditLog: [
      {
        id: "audit-gf-l3p-1",
        at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "Guest",
        action: "Dispute opened",
        detail: "Requested full refund; host offered 50%",
      },
      {
        id: "audit-gf-l3p-2",
        at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "Admin",
        action: "Dispute resolved",
        detail: "Full refund INR 2,280 processed",
      },
    ],
  },
  "GF-M9O2T4": {
    specialRequests: "Business retreat for small team. Need quiet workspace.",
    dietaryNeeds: "Mixed — 2 vegetarian, 3 standard",
    checkInStatus: "checked_in",
    refundStatus: "none",
    disputeStatus: "none",
    auditLog: [],
  },
  "GF-N1S4V6": {
    checkInStatus: "pending",
    refundStatus: "none",
    noShow: true,
    disputeStatus: "none",
    auditLog: [
      {
        id: "audit-gf-n1s-1",
        at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "System",
        action: "No-show flagged",
        detail: "Guest did not arrive by end of check-in day",
      },
    ],
  },
};

const EXTRA_SEED: HostBooking[] = [
  {
    id: "GF-M9O2T4",
    guest: "James Wilson",
    guestEmail: "james.wilson@example.com",
    guestPhone: "+971 58 333 9900",
    guestCountry: "United Kingdom",
    guestNotes: "Business retreat for small team.",
    property: "Green Valley Farmhouse",
    propertyLocation: "Al Ain, Abu Dhabi",
    roomType: "Farmhouse Villa",
    checkIn: "2026-07-18",
    checkOut: "2026-07-22",
    nights: 4,
    guests: 5,
    adults: 5,
    children: 0,
    nightlyRate: "INR 1,700",
    cleaningFee: "INR 250",
    serviceFee: "INR 400",
    total: "INR 7,350",
    paymentStatus: "Paid",
    paymentMethod: "Amex ···· 3005",
    bookedAt: "2026-07-01",
    status: "confirmed",
  },
  {
    id: "GF-N1S4V6",
    guest: "Daniel Brooks",
    guestEmail: "daniel.brooks@example.com",
    guestPhone: "+971 58 111 2233",
    guestCountry: "United States",
    guestNotes: "Late flight — may arrive after 10 PM.",
    property: "Spice Garden Cottage",
    propertyLocation: "Hatta, Dubai",
    roomType: "Garden Cottage",
    checkIn: "2026-07-10",
    checkOut: "2026-07-12",
    nights: 2,
    guests: 2,
    adults: 2,
    children: 0,
    nightlyRate: "INR 850",
    cleaningFee: "INR 100",
    serviceFee: "INR 150",
    total: "INR 1,950",
    paymentStatus: "Paid",
    paymentMethod: "Visa ···· 8822",
    bookedAt: "2026-07-02",
    status: "confirmed",
  },
];

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_BOOKINGS_SYNC_EVENT);
}

function toRecord(booking: HostBooking): HostBookingRecord {
  const extra = SEED_ENRICHMENTS[booking.id];
  const record: HostBookingRecord = {
    ...booking,
    specialRequests: extra?.specialRequests ?? booking.guestNotes,
    dietaryNeeds: extra?.dietaryNeeds ?? "",
    checkInStatus: extra?.checkInStatus ?? defaultCheckInStatus(booking.status),
    refundStatus: extra?.refundStatus ?? defaultRefundStatus(booking.status),
    refundAmount: extra?.refundAmount,
    cancelledAt: booking.status === "cancelled" ? booking.bookedAt : undefined,
    cancellationReason:
      booking.status === "cancelled" ? booking.guestNotes || "Guest cancelled" : undefined,
    disputeStatus: extra?.disputeStatus ?? "none",
    disputeSummary: extra?.disputeSummary,
    disputeGuestClaim: extra?.disputeGuestClaim,
    disputeHostResponse: extra?.disputeHostResponse,
    disputeResolution: extra?.disputeResolution,
    disputeOpenedAt: extra?.disputeOpenedAt,
    disputeResolvedAt: extra?.disputeResolvedAt,
    noShow: extra?.noShow ?? false,
    auditLog: extra?.auditLog ?? [],
  };
  return resolveBookingHost(record);
}

function defaultBookings(): HostBookingRecord[] {
  const merged = [...HOST_BOOKINGS];
  for (const extra of EXTRA_SEED) {
    if (!merged.some((b) => b.id === extra.id)) merged.push(extra);
  }
  return merged.map(toRecord);
}

function mergeRecords(stored: HostBookingRecord[]): HostBookingRecord[] {
  const defaults = defaultBookings();
  const map = new Map<string, HostBookingRecord>();
  for (const row of defaults) map.set(row.id, row);
  for (const row of stored) {
    const base = map.get(row.id);
    const merged = base ? { ...base, ...row, auditLog: row.auditLog ?? base.auditLog ?? [] } : row;
    map.set(row.id, resolveBookingHost(merged));
  }
  return Array.from(map.values()).sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
}

function replaceAedInString(s?: string): string | undefined {
  if (!s) return s;
  return s.replace(/\bAED\b/g, LAUNCH_CURRENCY);
}

function sanitizeHostBookingRecord(b: HostBookingRecord): { record: HostBookingRecord; changed: boolean } {
  let changed = false;
  let currency = b.currency;
  if (currency === "AED") {
    currency = LAUNCH_CURRENCY;
    changed = true;
  }
  const total = replaceAedInString(b.total) ?? b.total;
  if (total !== b.total) changed = true;
  const nightlyRate = replaceAedInString(b.nightlyRate) ?? b.nightlyRate;
  if (nightlyRate !== b.nightlyRate) changed = true;
  const cleaningFee = replaceAedInString(b.cleaningFee) ?? b.cleaningFee;
  if (cleaningFee !== b.cleaningFee) changed = true;
  const serviceFee = replaceAedInString(b.serviceFee) ?? b.serviceFee;
  if (serviceFee !== b.serviceFee) changed = true;
  const refundAmount = replaceAedInString(b.refundAmount);
  if (refundAmount !== b.refundAmount) changed = true;

  const auditLog = (b.auditLog ?? []).map((entry) => {
    const detail = replaceAedInString(entry.detail) ?? entry.detail;
    if (detail !== entry.detail) changed = true;
    return detail !== entry.detail ? { ...entry, detail } : entry;
  });

  return {
    record: changed
      ? {
          ...b,
          currency: currency ?? LAUNCH_CURRENCY,
          total,
          nightlyRate,
          cleaningFee,
          serviceFee,
          refundAmount,
          auditLog,
        }
      : b,
    changed,
  };
}

export function loadHostBookings(): HostBookingRecord[] {
  if (typeof window === "undefined") return defaultBookings();
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return defaultBookings();
    const parsed = JSON.parse(raw) as HostBookingRecord[];
    let anyChanged = false;
    const sanitized = parsed.map((row) => {
      const { record, changed } = sanitizeHostBookingRecord(row);
      if (changed) anyChanged = true;
      return record;
    });
    if (anyChanged) {
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(sanitized));
    }
    const rows = mergeRecords(sanitized);
    return applyLocalPendingExpiry(rows);
  } catch {
    return defaultBookings();
  }
}

/**
 * Merge Prisma bookings into local host store.
 * Server wins on status / payment / money fields; local keeps check-in & dispute extras.
 * When serverPrimary is true, omit demo seed rows (GF-*) not returned by the API.
 */
export function mergeServerHostBookings(
  server: HostBookingRecord[],
  opts?: { serverPrimary?: boolean }
): HostBookingRecord[] {
  if (typeof window === "undefined") return server;

  const local = loadHostBookings().filter((row) => {
    if (!opts?.serverPrimary) return true;
    if (row.id.startsWith("GF-")) return false;
    return server.some((s) => s.id === row.id);
  });

  const byId = new Map(local.map((b) => [b.id, b]));

  for (const s of server) {
    const existing = byId.get(s.id);
    if (!existing) {
      byId.set(s.id, s);
      continue;
    }
    const keepCompleted =
      existing.status === "completed" && s.status === "confirmed"
        ? ("completed" as const)
        : s.status;
    byId.set(s.id, {
      ...s,
      status: keepCompleted,
      expiresAt: existing.expiresAt ?? s.expiresAt,
      policyId: existing.policyId || s.policyId,
      checkInStatus: existing.checkInStatus,
      checkedInAt: existing.checkedInAt,
      checkedOutAt: existing.checkedOutAt,
      disputeStatus: existing.disputeStatus,
      disputeSummary: existing.disputeSummary,
      disputeGuestClaim: existing.disputeGuestClaim,
      disputeHostResponse: existing.disputeHostResponse,
      disputeResolution: existing.disputeResolution,
      disputeOpenedAt: existing.disputeOpenedAt,
      disputeResolvedAt: existing.disputeResolvedAt,
      noShow: existing.noShow,
      specialRequests: existing.specialRequests || s.specialRequests,
      dietaryNeeds: existing.dietaryNeeds || s.dietaryNeeds,
      auditLog:
        existing.auditLog?.length > 0 ? existing.auditLog : s.auditLog,
    });
  }

  const merged = Array.from(byId.values()).sort((a, b) =>
    b.bookedAt.localeCompare(a.bookedAt)
  );
  // Silent write — caller (useHostBookings.refresh) owns UI update; avoid sync loop
  saveHostBookings(merged, { silent: true });
  return applyLocalPendingExpiry(merged);
}

/** Auto-expire pending requests past host response deadline (client store). */
function applyLocalPendingExpiry(rows: HostBookingRecord[]): HostBookingRecord[] {
  const now = new Date();
  let stamped = false;
  let expired = false;
  const next = rows.map((b) => {
    if (b.status !== "pending") return b;
    const expiresAt =
      b.expiresAt ||
      computePendingExpiresAt(new Date(`${b.bookedAt}T12:00:00`)).toISOString();
    if (!b.expiresAt) {
      stamped = true;
    }
    if (!isPendingExpired(expiresAt, now)) {
      return b.expiresAt ? b : { ...b, expiresAt, policyId: b.policyId || "flexible" };
    }
    // Shared DB owns pending expiry. Locally flipping a server row back and forth
    // against GET /api/bookings re-fetched the dashboard in a loop.
    if (isSharedDbEnabled() && !b.id.startsWith("GF-")) {
      return b.expiresAt ? b : { ...b, expiresAt, policyId: b.policyId || "flexible" };
    }
    expired = true;
    return {
      ...b,
      status: "expired" as const,
      expiresAt,
      cancelledAt: now.toISOString(),
      cancellationReason: "Host did not respond in time",
      paymentStatus:
        b.paymentStatus === "Paid" || b.paymentStatus === "paid"
          ? "Refund pending"
          : b.paymentStatus,
      refundStatus: "full" as const,
      policyId: b.policyId || "flexible",
    };
  });
  if (stamped || expired) {
    const serialized = JSON.stringify(next);
    if (localStorage.getItem(BOOKINGS_KEY) !== serialized) {
      localStorage.setItem(BOOKINGS_KEY, serialized);
      if (expired) notify();
    }
  }
  return next;
}

export function previewCancelRefund(booking: HostBookingRecord, actor: "guest" | "host" = "host") {
  const totalMatch = booking.total.replace(/[^\d.]/g, "");
  const totalPrice = Number(totalMatch) || 0;
  return evaluateCancellationRefund({
    policyId: booking.policyId || "flexible",
    checkIn: booking.checkIn,
    totalPrice,
    paymentStatus:
      booking.paymentStatus.toLowerCase().includes("paid") ||
      booking.paymentStatus === "Paid"
        ? "paid"
        : "unpaid",
    forceFullRefund: actor === "host",
  });
}

export function saveHostBookings(
  bookings: HostBookingRecord[],
  opts?: { silent?: boolean }
): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(bookings);
  if (localStorage.getItem(BOOKINGS_KEY) === serialized) return;
  localStorage.setItem(BOOKINGS_KEY, serialized);
  if (!opts?.silent) notify();
}

export function getHostBookingRecord(id: string): HostBookingRecord | undefined {
  return loadHostBookings().find((b) => b.id === id);
}

export function updateHostBookingRecord(id: string, updates: HostBookingUpdate): HostBookingRecord | null {
  const all = loadHostBookings();
  const index = all.findIndex((b) => b.id === id);
  if (index < 0) return null;
  const next = { ...all[index], ...updates };
  all[index] = next;
  saveHostBookings(all);
  return next;
}

export function acceptHostBooking(id: string): HostBookingRecord | null {
  return updateHostBookingRecord(id, {
    status: "confirmed",
    checkInStatus: "pending",
    expiresAt: undefined,
  });
}

export function declineHostBooking(id: string): HostBookingRecord | null {
  return updateHostBookingRecord(id, {
    status: "declined",
    cancelledAt: new Date().toISOString(),
    cancellationReason: "Host declined the request",
    expiresAt: undefined,
  });
}

export function cancelHostBooking(
  id: string,
  input: { reason: string; refundStatus: HostBookingRecord["refundStatus"]; refundAmount?: string }
): HostBookingRecord | null {
  const existing = getHostBookingRecord(id);
  const preview = existing ? previewCancelRefund(existing, "host") : null;
  const refundStatus =
    input.refundStatus ||
    (preview ? refundStatusFromBand(preview.band) : "none");
  const currency =
    existing?.currency || existing?.total.match(/^([A-Z]{3})\b/)?.[1] || LAUNCH_CURRENCY;
  const refundAmount =
    input.refundAmount ||
    (preview && preview.refundAmount > 0
      ? `${currency} ${preview.refundAmount.toLocaleString()}`
      : undefined);

  return updateHostBookingRecord(id, {
    status: "cancelled",
    cancellationReason: input.reason.trim(),
    cancelledAt: new Date().toISOString(),
    refundStatus,
    refundAmount,
    paymentStatus:
      refundStatus === "none"
        ? "Cancelled"
        : refundStatus === "pending"
          ? "Refund pending"
          : "Refunded",
    checkInStatus: "pending",
    expiresAt: undefined,
  });
}

export function markHostBookingCheckedIn(id: string): HostBookingRecord | null {
  return updateHostBookingRecord(id, {
    checkInStatus: "checked_in",
    checkedInAt: new Date().toISOString(),
  });
}

export function markHostBookingCheckedOut(id: string): HostBookingRecord | null {
  const saved = updateHostBookingRecord(id, {
    checkInStatus: "checked_out",
    checkedOutAt: new Date().toISOString(),
    status: "completed",
  });
  if (saved) updateGuestBookingStatus(id, "completed");
  return saved;
}

export function getHostInstantBookEnabled(): boolean {
  return true;
}

export function setHostInstantBookEnabled(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTANT_BOOK_KEY, "true");
}

function newAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function appendBookingAudit(
  id: string,
  entry: Omit<BookingAuditEntry, "id" | "at"> & { at?: string }
): HostBookingRecord | null {
  const existing = getHostBookingRecord(id);
  if (!existing) return null;
  const audit: BookingAuditEntry = {
    id: newAuditId(),
    at: entry.at ?? new Date().toISOString(),
    actor: entry.actor,
    action: entry.action,
    detail: entry.detail,
  };
  return updateHostBookingRecord(id, {
    auditLog: [...(existing.auditLog ?? []), audit],
  });
}

export function adminForceCancelBooking(
  id: string,
  input: { reason: string; actor?: string }
): HostBookingRecord | null {
  const reason = input.reason.trim();
  if (!reason) return null;
  const updated = updateHostBookingRecord(id, {
    status: "cancelled",
    cancellationReason: reason,
    cancelledAt: new Date().toISOString(),
    paymentStatus: "Cancelled by admin",
    checkInStatus: "pending",
  });
  if (!updated) return null;
  return appendBookingAudit(id, {
    actor: input.actor ?? "Admin",
    action: "Force cancel",
    detail: reason,
  });
}

export function adminForceRefundBooking(
  id: string,
  input: { amount: string; reason: string; actor?: string }
): HostBookingRecord | null {
  const amount = input.amount.trim();
  const reason = input.reason.trim();
  if (!amount || !reason) return null;
  const updated = updateHostBookingRecord(id, {
    refundStatus: "full",
    refundAmount: amount,
    paymentStatus: "Refunded by admin",
  });
  if (!updated) return null;
  return appendBookingAudit(id, {
    actor: input.actor ?? "Admin",
    action: "Force refund",
    detail: `${amount} — ${reason}`,
  });
}

export function adminOpenDispute(
  id: string,
  input: { summary: string; guestClaim?: string; actor?: string }
): HostBookingRecord | null {
  const summary = input.summary.trim();
  if (!summary) return null;
  const updated = updateHostBookingRecord(id, {
    disputeStatus: "open",
    disputeSummary: summary,
    disputeGuestClaim: input.guestClaim?.trim() || undefined,
    disputeOpenedAt: new Date().toISOString(),
    disputeResolvedAt: undefined,
    disputeResolution: undefined,
  });
  if (!updated) return null;
  return appendBookingAudit(id, {
    actor: input.actor ?? "Admin",
    action: "Dispute opened",
    detail: summary,
  });
}

export function adminResolveDispute(
  id: string,
  input: { resolution: string; actor?: string }
): HostBookingRecord | null {
  const resolution = input.resolution.trim();
  if (!resolution) return null;
  const updated = updateHostBookingRecord(id, {
    disputeStatus: "resolved",
    disputeResolution: resolution,
    disputeResolvedAt: new Date().toISOString(),
  });
  if (!updated) return null;
  return appendBookingAudit(id, {
    actor: input.actor ?? "Admin",
    action: "Dispute resolved",
    detail: resolution,
  });
}

export function adminUpdateDisputeNotes(
  id: string,
  input: { hostResponse?: string; guestClaim?: string; actor?: string }
): HostBookingRecord | null {
  const updated = updateHostBookingRecord(id, {
    disputeHostResponse: input.hostResponse?.trim() || undefined,
    disputeGuestClaim: input.guestClaim?.trim() || undefined,
  });
  if (!updated) return null;
  if (input.hostResponse || input.guestClaim) {
    return appendBookingAudit(id, {
      actor: input.actor ?? "Admin",
      action: "Dispute notes updated",
      detail: [input.guestClaim && "Guest claim updated", input.hostResponse && "Host response updated"]
        .filter(Boolean)
        .join("; "),
    });
  }
  return updated;
}

export function adminMarkNoShow(
  id: string,
  input: { note?: string; actor?: string }
): HostBookingRecord | null {
  const updated = updateHostBookingRecord(id, { noShow: true });
  if (!updated) return null;
  return appendBookingAudit(id, {
    actor: input.actor ?? "Admin",
    action: "Marked no-show",
    detail: input.note?.trim() || "Guest did not check in",
  });
}

export function adminClearNoShow(id: string, actor = "Admin"): HostBookingRecord | null {
  const updated = updateHostBookingRecord(id, { noShow: false });
  if (!updated) return null;
  return appendBookingAudit(id, {
    actor,
    action: "No-show cleared",
  });
}
