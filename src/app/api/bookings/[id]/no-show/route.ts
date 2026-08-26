import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "@/lib/booking/confirm-booking";
import { setBookingNoShow } from "@/lib/booking/booking-ops";
import { canAccessAdmin } from "@/lib/auth/roles";
import {
  assertHostOwnsListing,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";

const bodySchema = z.object({
  noShow: z.boolean(),
  note: z.string().optional(),
});

export const POST = withBookingAuth(async (request, context, actor) => {
  try {
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid no-show payload" }, { status: 400 });
    }

    if (!isDemoApiMode()) {
      const existing = await loadBookingWithListing(id);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!canAccessAdmin(actor.roles)) {
        assertHostOwnsListing(existing, actor);
      }
    }

    const booking = await setBookingNoShow({
      bookingId: id,
      noShow: parsed.data.noShow,
      note: parsed.data.note,
      actor: canAccessAdmin(actor.roles) ? "Admin" : "Host",
    });
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
});
