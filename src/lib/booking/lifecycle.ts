import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { BookingError } from "@/lib/booking/confirm-booking";
import {
  evaluateCancellationRefund,
  isPendingExpired,
  refundStatusFromBand,
} from "@/lib/booking/policies";
import { bookingStayHasEnded } from "@/lib/booking/stay-ended";
import { stayNightDates } from "@/lib/booking/stay-night-dates";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { expireEndedFlashDeals } from "@/lib/server/listing-pricing-repo";
import { withAudit } from "@/lib/booking/booking-audit";
import { releaseBookingNights, releaseExperienceSlotCapacity } from "@/lib/booking/booking-nights";
import { BASE_CURRENCY } from "@/lib/currency";
import { shouldAutoIssueStripeRefund } from "@/lib/booking/refund-governance";

type Tx = Prisma.TransactionClient;

async function blockDates(tx: Tx, listingId: string, checkIn: Date, checkOut: Date) {
  const dates = stayNightDates(checkIn, checkOut);
  for (const date of dates) {
    await tx.availability.upsert({
      where: { listingId_date: { listingId, date } },
      create: { listingId, date, isBlocked: true },
      update: { isBlocked: true },
    });
  }
}

async function unblockDates(tx: Tx, listingId: string, checkIn: Date, checkOut: Date) {
  const dates = stayNightDates(checkIn, checkOut);
  await tx.availability.deleteMany({
    where: { listingId, date: { in: dates }, isBlocked: true },
  });
}

export async function maybeStripeRefund(input: {
  stripeSessionId?: string | null;
  amount: number;
  currency?: string;
}): Promise<{ refunded: boolean; refundId?: string; error?: string }> {
  if (!input.amount || input.amount <= 0) return { refunded: false };
  if (!isStripeConfigured() || !input.stripeSessionId) {
    return { refunded: false };
  }
  try {
    const stripe = getStripe()!;
    const session = await stripe.checkout.sessions.retrieve(input.stripeSessionId, {
      expand: ["payment_intent"],
    });
    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!pi) return { refunded: false, error: "No payment intent on session" };

    const currency = (input.currency || session.currency || BASE_CURRENCY).toLowerCase();
    const zeroDecimal = ["jpy", "krw"].includes(currency);
    const stripeAmount = zeroDecimal
      ? Math.round(input.amount)
      : Math.round(input.amount * 100);

    const refund = await stripe.refunds.create({
      payment_intent: pi,
      amount: stripeAmount,
    });
    return { refunded: true, refundId: refund.id };
  } catch (err) {
    return {
      refunded: false,
      error: err instanceof Error ? err.message : "Stripe refund failed",
    };
  }
}

export async function acceptBooking(bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");
    if (booking.status !== "pending") {
      throw new BookingError("Only pending bookings can be accepted", "INVALID_DATES");
    }
    if (isPendingExpired(booking.expiresAt)) {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "expired",
          cancelReason: "Host response window expired",
          cancelledAt: new Date(),
        },
      });
      await releaseBookingNights(tx, bookingId);
      await releaseExperienceSlotCapacity(tx, booking);
      throw new BookingError("This request has expired", "UNAVAILABLE");
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "confirmed",
        expiresAt: null,
        auditLog: withAudit(booking.auditLog, {
          actor: "Host",
          action: "Accepted",
          detail: "Request confirmed",
        }),
      },
    });

    if (updated.paymentStatus === "paid" && updated.checkOut) {
      await blockDates(tx, updated.listingId, updated.checkIn, updated.checkOut);
    }

    return updated;
  });
}

export async function declineBooking(bookingId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");
    if (booking.status !== "pending") {
      throw new BookingError("Only pending bookings can be declined", "INVALID_DATES");
    }

    const evaluation = evaluateCancellationRefund({
      policyId: booking.policyId,
      checkIn: booking.checkIn,
      totalPrice: booking.totalPrice,
      forceFullRefund: true,
      paymentStatus: booking.paymentStatus,
    });

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "declined",
        cancelledAt: new Date(),
        cancelReason: reason?.trim() || "Host declined the request",
        refundPercent: evaluation.refundPercent,
        refundAmount: evaluation.refundAmount,
        expiresAt: null,
        paymentStatus:
          evaluation.refundAmount > 0 ? "refund_pending" : booking.paymentStatus,
        auditLog: withAudit(booking.auditLog, {
          actor: "Host",
          action: "Declined",
          detail: reason?.trim() || "Host declined the request",
        }),
      },
    });

    await releaseBookingNights(tx, bookingId);
    await releaseExperienceSlotCapacity(tx, booking);

    return { booking: updated, evaluation };
  }).then(async (result) => {
    if (result.evaluation.stripeEligible && shouldAutoIssueStripeRefund()) {
      const stripe = await maybeStripeRefund({
        stripeSessionId: result.booking.stripeSessionId,
        amount: result.evaluation.refundAmount,
      });
      if (stripe.refunded) {
        const booking = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: "refunded",
            stripeRefundId: stripe.refundId,
            auditLog: withAudit(result.booking.auditLog, {
              actor: "System",
              action: "Refund issued",
              detail: stripe.refundId,
            }),
          },
        });
        return { booking, evaluation: result.evaluation, stripe };
      }
      return { ...result, stripe };
    }
    return { ...result, stripe: { refunded: false as const } };
  });
}

export async function cancelBooking(input: {
  bookingId: string;
  reason: string;
  /** guest | host | admin */
  actor: "guest" | "host" | "admin";
  /** Host/admin may force full guest refund */
  forceFullRefund?: boolean;
}) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");
  if (!["pending", "confirmed"].includes(booking.status)) {
    throw new BookingError("Booking cannot be cancelled", "INVALID_DATES");
  }

  const evaluation = evaluateCancellationRefund({
    policyId: booking.policyId,
    checkIn: booking.checkIn,
    totalPrice: booking.totalPrice,
    paymentStatus: booking.paymentStatus,
    forceFullRefund:
      input.forceFullRefund || input.actor === "host" || input.actor === "admin",
  });

  // Guest cancels: use matrix as-is (forceFullRefund false unless host)
  const guestEval =
    input.actor === "guest"
      ? evaluateCancellationRefund({
          policyId: booking.policyId,
          checkIn: booking.checkIn,
          totalPrice: booking.totalPrice,
          paymentStatus: booking.paymentStatus,
        })
      : evaluation;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.booking.update({
      where: { id: input.bookingId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: input.reason.trim() || "Cancelled",
        refundPercent: guestEval.refundPercent,
        refundAmount: guestEval.refundAmount,
        expiresAt: null,
        paymentStatus:
          guestEval.refundAmount > 0
            ? "refund_pending"
            : booking.paymentStatus === "paid"
              ? "paid"
              : booking.paymentStatus,
        auditLog: withAudit(booking.auditLog, {
          actor: input.actor === "admin" ? "Admin" : input.actor === "host" ? "Host" : "Guest",
          action: "Cancelled",
          detail: input.reason.trim() || "Cancelled",
        }),
      },
    });

    if (booking.status === "confirmed" && booking.checkOut) {
      await unblockDates(tx, booking.listingId, booking.checkIn, booking.checkOut);
    }

    await releaseBookingNights(tx, input.bookingId);
    await releaseExperienceSlotCapacity(tx, booking);

    return next;
  });

  let stripe: { refunded: boolean; refundId?: string; error?: string } = {
    refunded: false,
  };
  if (guestEval.stripeEligible && shouldAutoIssueStripeRefund()) {
    stripe = await maybeStripeRefund({
      stripeSessionId: booking.stripeSessionId,
      amount: guestEval.refundAmount,
    });
    if (stripe.refunded) {
      const paid = await prisma.booking.update({
        where: { id: input.bookingId },
        data: {
          paymentStatus: "refunded",
          stripeRefundId: stripe.refundId,
          auditLog: withAudit(updated.auditLog, {
            actor: "System",
            action: "Refund issued",
            detail: stripe.refundId,
          }),
        },
      });
      return {
        booking: paid,
        evaluation: guestEval,
        refundStatus: refundStatusFromBand(guestEval.band),
        stripe,
      };
    }
  }

  return {
    booking: updated,
    evaluation: guestEval,
    refundStatus: refundStatusFromBand(guestEval.band),
    stripe,
  };
}

let lastExpireAt = 0;
const EXPIRE_MIN_INTERVAL_MS = 60_000;

/** Expire pending requests past their deadline. Safe to call from cron or on read. */
export async function expirePendingBookings(
  now: Date = new Date(),
  opts?: { force?: boolean }
) {
  const ts = now.getTime();
  if (!opts?.force && ts - lastExpireAt < EXPIRE_MIN_INTERVAL_MS) {
    return { count: 0, bookings: [] };
  }
  lastExpireAt = ts;

  const stale = await prisma.booking.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      expiresAt: { lte: now },
      OR: [{ paymentStatus: "unpaid" }, { status: "pending" }],
    },
  });

  const expired = [];
  for (const booking of stale) {
    const unpaidHold = booking.paymentStatus === "unpaid";
    const evaluation = evaluateCancellationRefund({
      policyId: booking.policyId,
      checkIn: booking.checkIn,
      totalPrice: booking.totalPrice,
      forceFullRefund: true,
      paymentStatus: booking.paymentStatus,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "expired",
          cancelledAt: now,
          cancelReason: unpaidHold
            ? "Payment was not completed in time"
            : "Host did not respond in time",
          refundPercent: evaluation.refundPercent,
          refundAmount: evaluation.refundAmount,
          paymentStatus:
            evaluation.refundAmount > 0 ? "refund_pending" : booking.paymentStatus,
        },
      });
      if (booking.status === "confirmed" && booking.checkOut) {
        await unblockDates(tx, booking.listingId, booking.checkIn, booking.checkOut);
      }
      await releaseBookingNights(tx, booking.id);
      await releaseExperienceSlotCapacity(tx, booking);
      return next;
    });

    if (evaluation.stripeEligible && shouldAutoIssueStripeRefund()) {
      const stripe = await maybeStripeRefund({
        stripeSessionId: booking.stripeSessionId,
        amount: evaluation.refundAmount,
      });
      if (stripe.refunded) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: "refunded" },
        });
      }
    }

    expired.push(updated);
  }

  const completed = await completeDueStays(now, { force: true });
  const flashDeals = await expireEndedFlashDeals(now);
  const { runOperationalSync } = await import("@/lib/booking/operational-sync");
  const operational = await runOperationalSync(now);

  return {
    count: expired.length,
    bookings: expired,
    completed: completed.count,
    flashDealsExpired: flashDeals,
    operational,
  };
}

/** Host marks the guest as arrived. */
export async function checkInBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");
  if (booking.checkInStatus === "checked_in") return booking;
  if (booking.checkInStatus === "checked_out") {
    throw new BookingError("Guest has already checked out", "INVALID_DATES");
  }
  if (booking.status !== "confirmed") {
    throw new BookingError("Only confirmed stays can be checked in", "INVALID_DATES");
  }
  if (booking.paymentStatus !== "paid") {
    throw new BookingError("Guest has not paid yet", "INVALID_DATES");
  }

  const now = new Date();
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      checkInStatus: "checked_in",
      checkedInAt: booking.checkedInAt ?? now,
      checkInSource: "manual",
      auditLog: withAudit(booking.auditLog, {
        actor: "Host",
        action: "Checked in",
      }),
    },
  });
}

/** Host marks a confirmed stay as finished — unlocks the guest review. */
export async function completeBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");
  if (booking.status === "completed") return booking;
  if (booking.status !== "confirmed") {
    throw new BookingError("Only confirmed stays can be checked out", "INVALID_DATES");
  }
  if (booking.paymentStatus !== "paid") {
    throw new BookingError("Guest has not paid yet", "INVALID_DATES");
  }

  const now = new Date();
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "completed",
      checkInStatus: "checked_out",
      checkedInAt: booking.checkedInAt ?? now,
      checkedOutAt: now,
      checkOutSource: "manual",
      auditLog: withAudit(booking.auditLog, {
        actor: "Host",
        action: "Checked out",
      }),
    },
  });
}

/** Mark confirmed bookings as completed after check-out day. */
export async function completeDueStays(now: Date = new Date(), opts?: { force?: boolean }) {
  if (!opts?.force && now.getTime() - lastExpireAt < EXPIRE_MIN_INTERVAL_MS) {
    return { count: 0 };
  }

  const candidates = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      paymentStatus: "paid",
      checkOut: { lte: now },
    },
    select: { id: true, status: true, checkOut: true },
  });

  const dueIds = candidates.filter((row) => bookingStayHasEnded(row, now)).map((row) => row.id);
  if (dueIds.length === 0) return { count: 0 };

  const result = await prisma.booking.updateMany({
    where: { id: { in: dueIds }, status: "confirmed" },
    data: {
      status: "completed",
      checkInStatus: "checked_out",
      checkedOutAt: now,
      checkOutSource: "auto",
    },
  });

  return { count: result.count };
}
