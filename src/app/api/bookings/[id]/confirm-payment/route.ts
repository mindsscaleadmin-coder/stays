import { NextResponse } from "next/server";
import {
  assertGuestOwnsBooking,
  isDemoApiMode,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";
import { BookingError } from "@/lib/booking/confirm-booking";
import { confirmPaidFromStripe } from "@/lib/stripe/confirm-payment";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  sessionId: z.string().min(1).optional(),
});

/** Guest return from Stripe Checkout — verify the session and mark paid. */
export const POST = withBookingAuth(async (request, context, actor) => {
  try {
    const { id } = await context.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!isDemoApiMode()) {
      assertGuestOwnsBooking(booking, actor.id);
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    const paid = await confirmPaidFromStripe({
      bookingId: id,
      sessionId: parsed.success ? parsed.data.sessionId : undefined,
    });

    return NextResponse.json({ booking: paid, paid: paid.paymentStatus === "paid" });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
});
