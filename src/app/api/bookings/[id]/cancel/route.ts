import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "@/lib/booking/confirm-booking";
import { cancelBooking, expirePendingBookings } from "@/lib/booking/lifecycle";
import {
  isDemoApiMode,
  loadBookingWithListing,
  resolveCancelActor,
} from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";

const bodySchema = z.object({
  reason: z.string().min(1),
  forceFullRefund: z.boolean().optional(),
});

export const POST = withBookingAuth(async (request, context, session) => {
  try {
    await expirePendingBookings();
    const { id } = await context.params;
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid cancel payload" }, { status: 400 });
    }

    let actor: "guest" | "host" | "admin" = "guest";
    let forceFullRefund = parsed.data.forceFullRefund;

    if (!isDemoApiMode()) {
      const booking = await loadBookingWithListing(id);
      if (!booking) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      actor = resolveCancelActor(booking, session);
      if (actor !== "admin" && actor !== "host") {
        forceFullRefund = false;
      } else if (canAccessAdmin(session.roles) || actor === "host") {
        forceFullRefund = parsed.data.forceFullRefund ?? true;
      }
    } else if (typeof json.actor === "string") {
      actor = json.actor as "guest" | "host" | "admin";
    }

    const result = await cancelBooking({
      bookingId: id,
      reason: parsed.data.reason,
      actor,
      forceFullRefund,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
});
