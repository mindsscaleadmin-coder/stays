import { NextResponse } from "next/server";
import { BookingError } from "@/lib/booking/confirm-booking";
import { acceptBooking, expirePendingBookings } from "@/lib/booking/lifecycle";
import {
  assertHostOwnsListing,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";
import { enqueueBookingConfirmedJob } from "@/lib/queue/enqueue";

export const POST = withBookingAuth(async (_request, context, actor) => {
  try {
    await expirePendingBookings();
    const { id } = await context.params;

    if (!isDemoApiMode()) {
      const existing = await loadBookingWithListing(id);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      assertHostOwnsListing(existing, actor);
    }

    const booking = await acceptBooking(id);
    void enqueueBookingConfirmedJob({ bookingId: booking.id, guestId: booking.guestId });
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
});
