import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { BookingError } from "@/lib/booking/confirm-booking";
import {
  evaluateCancellationRefund,
  isPendingExpired,
  refundStatusFromBand,
} from "@/lib/booking/policies";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";

type Tx = Prisma.TransactionClient;

function getDatesInRange(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(checkIn);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function blockDates(tx: Tx, listingId: string, checkIn: Date, checkOut: Date) {
  const dates = getDatesInRange(checkIn, checkOut);
  for (const date of dates) {
    await tx.availability.upsert({
      where: { listingId_date: { listingId, date } },
      create: { listingId, date, isBlocked: true },
      update: { isBlocked: true },
    });
  }
}

async function unblockDates(tx: Tx, listingId: string, checkIn: Date, checkOut: Date) {
  const dates = getDatesInRange(checkIn, checkOut);
  await tx.availability.deleteMany({
    where: { listingId, date: { in: dates }, isBlocked: true },
  });
}

async function maybeStripeRefund(input: {
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

    const currency = (input.currency || session.currency || "aed").toLowerCase();
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
      throw new BookingError("This request has expired", "UNAVAILABLE");
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed", expiresAt: null },
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
      },
    });

    return { booking: updated, evaluation };
  }).then(async (result) => {
    if (result.evaluation.stripeEligible) {
      const stripe = await maybeStripeRefund({
        stripeSessionId: result.booking.stripeSessionId,
        amount: result.evaluation.refundAmount,
      });
      if (stripe.refunded) {
        const booking = await prisma.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: "refunded" },
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
      },
    });

    if (booking.status === "confirmed" && booking.checkOut) {
      await unblockDates(tx, booking.listingId, booking.checkIn, booking.checkOut);
    }

    return next;
  });

  let stripe: { refunded: boolean; refundId?: string; error?: string } = {
    refunded: false,
  };
  if (guestEval.stripeEligible) {
    stripe = await maybeStripeRefund({
      stripeSessionId: booking.stripeSessionId,
      amount: guestEval.refundAmount,
    });
    if (stripe.refunded) {
      const paid = await prisma.booking.update({
        where: { id: input.bookingId },
        data: { paymentStatus: "refunded" },
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

/** Expire pending requests past their deadline. Safe to call from cron or on read. */
export async function expirePendingBookings(now: Date = new Date()) {
  const stale = await prisma.booking.findMany({
    where: {
      status: "pending",
      expiresAt: { lte: now },
    },
  });

  const expired = [];
  for (const booking of stale) {
    const evaluation = evaluateCancellationRefund({
      policyId: booking.policyId,
      checkIn: booking.checkIn,
      totalPrice: booking.totalPrice,
      forceFullRefund: true,
      paymentStatus: booking.paymentStatus,
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "expired",
        cancelledAt: now,
        cancelReason: "Host did not respond in time",
        refundPercent: evaluation.refundPercent,
        refundAmount: evaluation.refundAmount,
        paymentStatus:
          evaluation.refundAmount > 0 ? "refund_pending" : booking.paymentStatus,
      },
    });

    if (evaluation.stripeEligible) {
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

  return { count: expired.length, bookings: expired };
}
