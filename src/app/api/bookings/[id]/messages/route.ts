import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertBookingParticipant,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";
import {
  createBookingMessage,
  listBookingMessages,
} from "@/lib/booking/booking-messages-repo";

export const GET = withBookingAuth(async (_request, context, actor) => {
  const { id } = await context.params;

  if (!isDemoApiMode()) {
    const booking = await loadBookingWithListing(id);
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    assertBookingParticipant(booking, actor);
  }

  const messages = await listBookingMessages(id);
  if (!messages) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ messages, bookingId: id });
});

const postSchema = z.object({
  body: z.string().min(1).max(4000),
  senderRole: z.enum(["guest", "host", "admin"]),
  senderId: z.string().min(1),
  senderName: z.string().min(1).max(120),
});

export const POST = withBookingAuth(async (request, context, actor) => {
  try {
    const { id } = await context.params;
    const json = await request.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    if (!isDemoApiMode()) {
      const booking = await loadBookingWithListing(id);
      if (!booking) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      assertBookingParticipant(booking, actor);
      if (parsed.data.senderId !== actor.id) {
        return NextResponse.json({ error: "senderId must match signed-in user" }, { status: 403 });
      }
    }

    const message = await createBookingMessage({
      bookingId: id,
      ...parsed.data,
    });

    if (!message) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, persisted: true, message });
  } catch (error) {
    console.error("Booking message error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 }
    );
  }
});
