import { prisma } from "@/lib/prisma";
import { BookingError } from "@/lib/booking/confirm-booking";
import { markBookingPaid } from "@/lib/booking/mark-paid";
import { captureBookingFinancials } from "@/lib/booking/capture-booking-financials";
import { enqueueBookingConfirmedJob } from "@/lib/queue/enqueue";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";

function sessionLooksPaid(session: {
  payment_status?: string | null;
  status?: string | null;
}): boolean {
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
    return true;
  }
  return session.status === "complete" && session.payment_status !== "unpaid";
}

/**
 * Mark a booking paid when Stripe Checkout says the session is paid.
 * Safe to call from the success page (guest return) and the webhook.
 */
export async function confirmPaidFromStripe(input: {
  bookingId: string;
  sessionId?: string | null;
}) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new BookingError("Booking not found", "NOT_FOUND");

  if (!isStripeConfigured()) {
    throw new BookingError("Stripe is not configured", "INVALID_DATES");
  }

  const sessionId = input.sessionId || booking.stripeSessionId;
  if (!sessionId) {
    throw new BookingError("No Stripe session for this booking", "INVALID_DATES");
  }

  const stripe = getStripe()!;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const metaIds = (session.metadata?.bookingIds || session.metadata?.bookingId || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (metaIds.length > 0 && !metaIds.includes(booking.id)) {
    throw new BookingError("Stripe session does not match booking", "INVALID_DATES");
  }

  if (!sessionLooksPaid(session)) return booking;

  const siblings = await prisma.booking.findMany({
    where: {
      OR: [
        { stripeSessionId: session.id },
        { id: { in: metaIds.length > 0 ? metaIds : [booking.id] } },
      ],
    },
    select: { id: true, paymentStatus: true, guestId: true, stripeSessionId: true },
  });

  const sessionBookingTotals = new Map<string, number>();
  const siblingRows = await prisma.booking.findMany({
    where: { id: { in: siblings.map((s) => s.id) } },
    select: { id: true, totalPrice: true },
  });
  for (const row of siblingRows) {
    sessionBookingTotals.set(row.id, row.totalPrice);
  }
  const sessionTotal = siblingRows.reduce((sum, row) => sum + row.totalPrice, 0);

  let paid = booking;
  for (const row of siblings) {
    if (row.stripeSessionId !== session.id) {
      await prisma.booking.update({
        where: { id: row.id },
        data: { stripeSessionId: session.id },
      });
    }
    if (row.paymentStatus === "paid") {
      if (row.id === booking.id) paid = { ...booking, paymentStatus: "paid" };
      continue;
    }
    const next = await markBookingPaid(row.id);
    await captureBookingFinancials(next.id, {
      stripeSessionId: session.id,
      sessionBookingTotals:
        sessionTotal > 0 ? sessionBookingTotals : undefined,
    });
    void enqueueBookingConfirmedJob({ bookingId: next.id, guestId: next.guestId });
    if (next.id === booking.id) paid = next;
  }

  if (paid.paymentStatus !== "paid") {
    const next = await markBookingPaid(booking.id);
    await captureBookingFinancials(next.id, {
      stripeSessionId: session.id,
      sessionBookingTotals:
        sessionTotal > 0 ? sessionBookingTotals : undefined,
    });
    return next;
  }
  return paid;
}
