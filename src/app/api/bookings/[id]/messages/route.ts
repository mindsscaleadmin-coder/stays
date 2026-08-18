import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertBookingParticipant,
  getUserRoles,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";
import { getSessionUser } from "@/lib/auth/session";
import {
  createBookingMessage,
  listBookingMessages,
} from "@/lib/booking/booking-messages-repo";

export const GET = withBookingAuth(async (_request, context, userId) => {
  const { id } = await context.params;

  if (!isDemoApiMode()) {
    const booking = await loadBookingWithListing(id);
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const user = await getSessionUser();
    const roles = user ? getUserRoles(user) : [];
    assertBookingParticipant(booking, userId, roles);
  }

  const messages = await listBookingMessages(id);
  return NextResponse.json({ messages, bookingId: id });
});

const postSchema = z.object({
  body: z.string().min(1).max(4000),
  senderRole: z.enum(["guest", "host", "admin"]),
  senderId: z.string().min(1),
  senderName: z.string().min(1).max(120),
});

export const POST = withBookingAuth(async (request, context, userId) => {
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
      const user = await getSessionUser();
      const roles = user ? getUserRoles(user) : [];
      assertBookingParticipant(booking, userId, roles);
      if (parsed.data.senderId !== userId) {
        return NextResponse.json({ error: "senderId must match signed-in user" }, { status: 403 });
      }
    }

    const message = await createBookingMessage({
      bookingId: id,
      ...parsed.data,
    });

    if (!message) {
      return NextResponse.json({
        ok: true,
        persisted: false,
        message: {
          id: `local-${Date.now()}`,
          bookingId: id,
          ...parsed.data,
          createdAt: new Date().toISOString(),
        },
      });
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
