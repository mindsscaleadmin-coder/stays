import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "@/lib/booking/confirm-booking";
import { refundBooking } from "@/lib/booking/booking-ops";
import { canAccessAdmin } from "@/lib/auth/roles";
import {
  assertHostOwnsListing,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";

const bodySchema = z.object({
  amount: z.union([z.string(), z.number()]).optional(),
  reason: z.string().optional(),
  completePending: z.boolean().optional(),
});

export const POST = withBookingAuth(async (request, context, actor) => {
  try {
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid refund payload" }, { status: 400 });
    }

    const isAdmin = canAccessAdmin(actor.roles);
    if (!isDemoApiMode()) {
      const existing = await loadBookingWithListing(id);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!isAdmin) {
        assertHostOwnsListing(existing, actor);
      }
    }

    const booking = await refundBooking({
      bookingId: id,
      actor: isAdmin ? "admin" : "host",
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      completePending: parsed.data.completePending,
    });
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
});
