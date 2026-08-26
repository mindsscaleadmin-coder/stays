import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "@/lib/booking/confirm-booking";
import { createQuotedBooking } from "@/lib/booking/create-quoted-booking";
import { markBookingPaid } from "@/lib/booking/mark-paid";
import {
  queryBookings,
  toGuestBookingSummary,
  toHostBookingRecord,
} from "@/lib/booking/list-bookings";
import { getStripe, isStripeConfigured, toStripeAmount } from "@/lib/stripe/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireSessionUser } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/session";
import { authErrorResponse } from "@/lib/auth/session";
import { getRequestId } from "@/lib/observability/logger";
import { enqueueBookingConfirmedJob } from "@/lib/queue/enqueue";
import { expirePendingBookings } from "@/lib/booking/lifecycle";
import { prisma } from "@/lib/prisma";
import { resolveSessionActor } from "@/lib/auth/resolve-actor";
import { canAccessAdmin } from "@/lib/auth/roles";

function supabaseConfigured() {
  return isSupabaseConfigured();
}

/**
 * List bookings from Prisma (source of truth for host calendar / guest trips).
 * Demo mode: no session required; filter via query params.
 * With Supabase: guest role prefers session user id.
 */
export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get("role") || "host") as "host" | "guest";
    if (role !== "host" && role !== "guest") {
      return NextResponse.json({ error: "role must be host or guest" }, { status: 400 });
    }

    let hostId = searchParams.get("hostId") || undefined;
    let guestId = searchParams.get("guestId") || undefined;
    const listingId = searchParams.get("listingId") || undefined;

    if (supabaseConfigured()) {
      const user = await requireSessionUser();
      const actor = await resolveSessionActor(user);

      if (role === "guest") {
        guestId = user.id;
      } else if (canAccessAdmin(actor.roles)) {
        hostId = searchParams.get("hostId") || undefined;
      } else {
        hostId = actor.staffHostId || user.id;
      }
    }

    if (role === "guest" && !guestId) {
      return NextResponse.json(
        { error: "guestId required (or sign in)" },
        { status: 400 }
      );
    }

    // Expire stale pending requests before listing so host calendar / guest trips stay current.
    await expirePendingBookings();

    // Host list: without hostId returns all (local demo / single-operator).
    // Pass hostId to scope when listings are owned by a real host user.
    const rows = await queryBookings({ role, hostId, guestId, listingId });

    if (role === "guest") {
      return NextResponse.json({
        bookings: rows.map(toGuestBookingSummary),
        source: "prisma" as const,
      });
    }

    return NextResponse.json({
      bookings: rows.map(toHostBookingRecord),
      source: "prisma" as const,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, requestId);
    }
    console.error("List bookings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

const bodySchema = z.object({
  listingId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestCount: z.number().int().min(1).max(50),
  nightlyRate: z.number().min(0).optional(),
  accommodation: z.number().min(0).optional(),
  experiencesTotal: z.number().min(0).optional().default(0),
  extrasTotal: z.number().min(0).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
  currency: z.string().min(3).max(3).optional().default("AED"),
  listing: z.object({
    id: z.string(),
    title: z.string(),
    hostId: z.string().optional(),
    hostName: z.string().optional(),
    location: z.string().optional(),
    maxGuests: z.number().optional(),
    pricePerNight: z.number(),
    instantBook: z.boolean().optional(),
    currency: z.string().optional(),
  }),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  roomIds: z.array(z.string()).optional(),
  experienceIds: z.array(z.string()).optional(),
  extraIds: z.array(z.string()).optional(),
  /** When true and Stripe is not configured, mark paid immediately (local demo). */
  demoPay: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    let resolvedGuestId: string | null = null;
    let guestEmail = body.guestEmail;
    let guestName = body.guestName;

    if (supabaseConfigured()) {
      const user = await requireSessionUser();
      resolvedGuestId = user.id;
      guestEmail = guestEmail || user.email || undefined;
      guestName =
        guestName ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        undefined;
    }

    // Demo auth: accept guestId from body only when Supabase is not configured
    const guestId =
      resolvedGuestId ||
      (!supabaseConfigured() && typeof json.guestId === "string" && json.guestId
        ? json.guestId
        : null);

    if (!guestId) {
      return NextResponse.json({ error: "Sign in required to book" }, { status: 401 });
    }

    const { booking, quote } = await createQuotedBooking({
      listingId: body.listingId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guestCount: body.guestCount,
      guestId,
      guestName,
      guestEmail,
      roomIds: body.roomIds,
      experienceIds: body.experienceIds,
      extraIds: body.extraIds,
      currency: body.currency,
      listing: body.listing,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${appUrl}/booking/${body.listingId}/success?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/booking/${body.listingId}/checkout?checkIn=${body.checkIn}&checkOut=${body.checkOut}&guests=${body.guestCount}`;

    if (isStripeConfigured()) {
      const stripe = getStripe()!;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: guestEmail,
        expires_at: Math.floor(Date.now() / 1000) + 23 * 60 * 60,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: quote.currency.toLowerCase(),
              unit_amount: toStripeAmount(quote.total, quote.currency),
              product_data: {
                name: body.listing.title,
                description: `${body.checkIn} → ${body.checkOut} · ${body.guestCount} guest${body.guestCount === 1 ? "" : "s"}`,
              },
            },
          },
        ],
        metadata: {
          bookingId: booking.id,
          bookingIds: booking.id,
          listingId: body.listingId,
        },
      });

      const withSession = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          stripeSessionId: session.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.json({
        booking: withSession,
        quote,
        mode: "stripe" as const,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    }

    // Demo path: optional immediate pay
    if (body.demoPay) {
      const paid = await markBookingPaid(booking.id);
      void enqueueBookingConfirmedJob({ bookingId: paid.id, guestId: paid.guestId });
      return NextResponse.json({
        booking: paid,
        quote,
        mode: "demo" as const,
        paid: true,
      });
    }

    return NextResponse.json({
      booking,
      quote,
      mode: "demo" as const,
      paid: false,
      demoPayAvailable: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
