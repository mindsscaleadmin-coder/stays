import { NextResponse } from "next/server";
import { BookingError } from "@/lib/booking/confirm-booking";
import { declineBooking, expirePendingBookings } from "@/lib/booking/lifecycle";
import {
  assertHostOwnsListing,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";

export const POST = withBookingAuth(async (request, context, userId) => {
  try {
    await expirePendingBookings();
    const { id } = await context.params;

    if (!isDemoApiMode()) {
      const booking = await loadBookingWithListing(id);
      if (!booking) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      assertHostOwnsListing(booking, userId);
    }

    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = typeof body.reason === "string" ? body.reason : undefined;
    } catch {
      reason = undefined;
    }
    const result = await declineBooking(id, reason);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
});
