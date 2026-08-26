import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "@/lib/booking/confirm-booking";
import {
  openBookingDispute,
  resolveBookingDispute,
  updateBookingDisputeNotes,
} from "@/lib/booking/booking-ops";
import {
  canAccessAdmin,
} from "@/lib/auth/roles";
import {
  assertHostOwnsListing,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";

const bodySchema = z.object({
  action: z.enum(["open", "resolve", "notes"]),
  summary: z.string().optional(),
  guestClaim: z.string().optional(),
  hostResponse: z.string().optional(),
  resolution: z.string().optional(),
});

export const POST = withBookingAuth(async (request, context, actor) => {
  try {
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid dispute payload" }, { status: 400 });
    }

    if (!isDemoApiMode()) {
      const existing = await loadBookingWithListing(id);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (canAccessAdmin(actor.roles)) {
        // admin may intervene on any booking
      } else {
        assertHostOwnsListing(existing, actor);
      }
    }

    const actorLabel = canAccessAdmin(actor.roles) ? "Admin" : "Host";
    let booking;
    if (parsed.data.action === "open") {
      booking = await openBookingDispute({
        bookingId: id,
        summary: parsed.data.summary ?? "",
        guestClaim: parsed.data.guestClaim,
        actor: actorLabel,
      });
    } else if (parsed.data.action === "resolve") {
      booking = await resolveBookingDispute({
        bookingId: id,
        resolution: parsed.data.resolution ?? "",
        actor: actorLabel,
      });
    } else {
      booking = await updateBookingDisputeNotes({
        bookingId: id,
        hostResponse: parsed.data.hostResponse,
        guestClaim: parsed.data.guestClaim,
        actor: actorLabel,
      });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
});
