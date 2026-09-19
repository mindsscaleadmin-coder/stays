import { prisma } from "@/lib/prisma";
import { normalizeBookingMoney } from "@/lib/booking/normalize-booking-money";
import { BookingError } from "@/lib/booking/confirm-booking";
import { maybeStripeRefund } from "@/lib/booking/lifecycle";
import { refundStatusFromBand } from "@/lib/booking/policies";
import { MANUAL_REFUND_APPROVAL } from "@/lib/booking/refund-governance";
import { withAudit } from "@/lib/booking/booking-audit";
import type { DisputeStatus, RefundStatus } from "@/lib/host/host-booking-types";

function parseMoney(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function openBookingDispute(input: {
  bookingId: string;
  summary: string;
  guestClaim?: string;
  actor: string;
}) {
  const summary = input.summary.trim();
  if (!summary) throw new BookingError("Dispute summary required", "INVALID_DATES");

  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");

  return prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      disputeStatus: "open",
      disputeSummary: summary,
      disputeGuestClaim: input.guestClaim?.trim() || booking.disputeGuestClaim,
      disputeOpenedAt: booking.disputeOpenedAt ?? new Date(),
      disputeResolvedAt: null,
      disputeResolution: null,
      auditLog: withAudit(booking.auditLog, {
        actor: input.actor,
        action: "Dispute opened",
        detail: summary,
      }),
    },
  });
}

export async function resolveBookingDispute(input: {
  bookingId: string;
  resolution: string;
  actor: string;
}) {
  const resolution = input.resolution.trim();
  if (!resolution) throw new BookingError("Resolution required", "INVALID_DATES");

  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");

  return prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      disputeStatus: "resolved",
      disputeResolution: resolution,
      disputeResolvedAt: new Date(),
      auditLog: withAudit(booking.auditLog, {
        actor: input.actor,
        action: "Dispute resolved",
        detail: resolution,
      }),
    },
  });
}

export async function updateBookingDisputeNotes(input: {
  bookingId: string;
  hostResponse?: string;
  guestClaim?: string;
  actor: string;
}) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");

  const hostResponse = input.hostResponse?.trim();
  const guestClaim = input.guestClaim?.trim();

  return prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      disputeHostResponse: hostResponse || booking.disputeHostResponse,
      disputeGuestClaim: guestClaim || booking.disputeGuestClaim,
      auditLog: withAudit(booking.auditLog, {
        actor: input.actor,
        action: "Dispute notes updated",
        detail: [guestClaim && "Guest claim updated", hostResponse && "Host response updated"]
          .filter(Boolean)
          .join("; "),
      }),
    },
  });
}

export async function setBookingNoShow(input: {
  bookingId: string;
  noShow: boolean;
  note?: string;
  actor: string;
}) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");

  return prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      noShow: input.noShow,
      auditLog: withAudit(booking.auditLog, {
        actor: input.actor,
        action: input.noShow ? "Marked no-show" : "No-show cleared",
        detail: input.note?.trim() || (input.noShow ? "Guest did not check in" : undefined),
      }),
    },
  });
}

export async function refundBooking(input: {
  bookingId: string;
  actor: "host" | "admin";
  /** Admin may pass a specific amount; otherwise remaining paid total. */
  amount?: string | number;
  reason?: string;
  /** Host confirming an already-pending policy refund without a new Stripe call. */
  completePending?: boolean;
}) {
  const row = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!row) throw new BookingError("Booking not found", "NOT_FOUND");
  const booking = normalizeBookingMoney(row);

  if (booking.paymentStatus === "refunded") return row;

  const paid = booking.paymentStatus === "paid" || booking.paymentStatus === "refund_pending";
  if (!paid) {
    throw new BookingError("No paid amount to refund", "INVALID_DATES");
  }

  const alreadyRefunded = booking.paymentStatus === "refunded" ? booking.refundAmount ?? 0 : 0;
  const remaining = Math.max(0, booking.totalPrice - alreadyRefunded);
  const requested =
    parseMoney(input.amount) ??
    (booking.refundAmount && booking.refundAmount > 0 ? booking.refundAmount : remaining);
  const amount = Math.min(requested, remaining);
  if (amount <= 0) {
    throw new BookingError("Refund amount must be greater than zero", "INVALID_DATES");
  }

  const percent = Math.round((amount / booking.totalPrice) * 100);
  const refundStatus: RefundStatus = percent >= 100 ? "full" : "partial";

  if (MANUAL_REFUND_APPROVAL && input.actor === "host") {
    throw new BookingError(
      "Refunds require admin approval. Approve from Admin → Financial → Refund approvals, or mark an offline refund as complete.",
      "INVALID_DATES"
    );
  }

  if (input.completePending && booking.paymentStatus === "refund_pending" && input.actor === "admin") {
    return prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        paymentStatus: "refunded",
        refundAmount: booking.refundAmount ?? amount,
        refundPercent: booking.refundPercent ?? percent,
        auditLog: withAudit(booking.auditLog, {
          actor: "Host",
          action: "Refund marked complete",
          detail: input.reason?.trim() || "Offline refund confirmed",
        }),
      },
    });
  }

  const stripe = await maybeStripeRefund({
    stripeSessionId: booking.stripeSessionId,
    amount,
  });

  const nextStatus = stripe.refunded
    ? "refunded"
    : booking.stripeSessionId
      ? "refund_pending"
      : "refunded";

  return prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      paymentStatus: nextStatus,
      refundAmount: amount,
      refundPercent: percent,
      stripeRefundId: stripe.refundId ?? booking.stripeRefundId,
      cancelReason: input.reason?.trim() || booking.cancelReason,
      auditLog: withAudit(booking.auditLog, {
        actor: input.actor === "admin" ? "Admin" : "Host",
        action: stripe.refunded ? "Refund issued" : "Refund recorded",
        detail: [
          `${refundStatus} · ${amount}`,
          input.reason?.trim(),
          stripe.refundId,
          stripe.error,
        ]
          .filter(Boolean)
          .join(" — "),
      }),
    },
  });
}

/** Admin declined a queued policy refund — booking stays cancelled, no Stripe refund. */
export async function rejectPendingRefund(input: {
  bookingId: string;
  actor: string;
  reason?: string;
}) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");
  if (booking.paymentStatus !== "refund_pending") {
    throw new BookingError("No pending refund on this booking", "INVALID_DATES");
  }

  const note = input.reason?.trim() || "Admin declined refund";

  return prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      paymentStatus: "paid",
      auditLog: withAudit(booking.auditLog, {
        actor: input.actor,
        action: "Refund rejected",
        detail: note,
      }),
    },
  });
}

export function mapDisputeStatus(value: string | null | undefined): DisputeStatus {
  if (value === "open" || value === "resolved") return value;
  return "none";
}

export function mapRefundStatusFromRow(row: {
  paymentStatus: string;
  refundPercent: number | null;
  refundAmount: number | null;
}): RefundStatus {
  const pay = row.paymentStatus.toLowerCase();
  if (pay === "refund_pending") return "pending";
  if (pay.includes("refund") || (row.refundAmount != null && row.refundAmount > 0)) {
    if (row.refundPercent != null && row.refundPercent >= 100) return "full";
    if (row.refundPercent != null && row.refundPercent > 0) return "partial";
    return refundStatusFromBand(
      row.refundAmount && row.refundAmount > 0 ? "partial" : "none"
    );
  }
  return "none";
}
