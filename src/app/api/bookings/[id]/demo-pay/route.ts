import { NextResponse } from "next/server";
import {
  assertGuestOwnsBooking,
  isDemoApiMode,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";
import { markBookingPaid } from "@/lib/booking/mark-paid";
import { captureBookingFinancials } from "@/lib/booking/capture-booking-financials";
import { BookingError } from "@/lib/booking/confirm-booking";
import { isStripeConfigured } from "@/lib/stripe/server";
import { prisma } from "@/lib/prisma";
import { enqueueBookingConfirmedJob } from "@/lib/queue/enqueue";

/**
 * Demo-only: mark an unpaid booking as paid when Stripe is not configured.
 * Rejects if Stripe keys are present (use Checkout + webhook instead).
 */
export const POST = withBookingAuth(async (_request, context, actor) => {
  try {
    if (isStripeConfigured()) {
      return NextResponse.json(
        { error: "Use Stripe Checkout when Stripe is configured" },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!isDemoApiMode()) {
      assertGuestOwnsBooking(booking, actor.id);
    }

    const paid = await markBookingPaid(id);
    await captureBookingFinancials(paid.id);
    void enqueueBookingConfirmedJob({ bookingId: paid.id, guestId: paid.guestId });
    return NextResponse.json({ booking: paid });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
});
