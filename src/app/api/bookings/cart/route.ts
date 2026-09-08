import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "@/lib/booking/confirm-booking";
import { createQuotedBooking } from "@/lib/booking/create-quoted-booking";
import { markBookingPaid } from "@/lib/booking/mark-paid";
import { getStripe, isStripeConfigured, toStripeAmount } from "@/lib/stripe/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireSessionUser, AuthError, authErrorResponse } from "@/lib/auth/session";
import { enqueueBookingConfirmedJob } from "@/lib/queue/enqueue";
import { prisma } from "@/lib/prisma";
import { BASE_CURRENCY } from "@/lib/currency";

const listingSchema = z.object({
  id: z.string(),
  title: z.string(),
  hostId: z.string().optional(),
  hostName: z.string().optional(),
  location: z.string().optional(),
  maxGuests: z.number().optional(),
  pricePerNight: z.number(),
  instantBook: z.boolean().optional(),
  currency: z.string().optional(),
});

const lineSchema = z.object({
  listingId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestCount: z.number().int().min(1).max(50),
  currency: z.string().min(3).max(3).optional().default(BASE_CURRENCY),
  roomIds: z.array(z.string()).optional(),
  experienceIds: z.array(z.string()).optional(),
  extraIds: z.array(z.string()).optional(),
  listing: listingSchema,
});

const bodySchema = z.object({
  lines: z.array(lineSchema).min(1).max(20),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  demoPay: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid cart payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    let guestId: string | null = null;
    let guestEmail = body.guestEmail;
    let guestName = body.guestName;

    if (isSupabaseConfigured()) {
      const user = await requireSessionUser();
      guestId = user.id;
      guestEmail = guestEmail || user.email || undefined;
      guestName =
        guestName ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        undefined;
    } else if (typeof json.guestId === "string" && json.guestId) {
      guestId = json.guestId;
    }

    if (!guestId) {
      return NextResponse.json({ error: "Sign in required to book" }, { status: 401 });
    }

    const created: { booking: Awaited<ReturnType<typeof createQuotedBooking>>["booking"]; quote: Awaited<ReturnType<typeof createQuotedBooking>>["quote"]; title: string; checkIn: string; checkOut: string; guests: number }[] = [];

    try {
      for (const line of body.lines) {
        const result = await createQuotedBooking({
          listingId: line.listingId,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
          guestCount: line.guestCount,
          guestId,
          guestName,
          guestEmail,
          roomIds: line.roomIds,
          experienceIds: line.experienceIds,
          extraIds: line.extraIds,
          currency: line.currency,
          listing: line.listing,
        });
        created.push({
          ...result,
          title: line.listing.title,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
          guests: line.guestCount,
        });
        if (
          line.currency &&
          line.currency.toUpperCase() !== result.quote.currency.toUpperCase()
        ) {
          throw new BookingError(
            "Each cart stay must match the listing currency",
            "INVALID_DATES"
          );
        }
      }
    } catch (error) {
      for (const row of created) {
        await prisma.booking.delete({ where: { id: row.booking.id } }).catch(() => undefined);
      }
      throw error;
    }

    const currencies = new Set(created.map((row) => row.quote.currency.toUpperCase()));
    if (currencies.size > 1) {
      for (const row of created) {
        await prisma.booking.delete({ where: { id: row.booking.id } }).catch(() => undefined);
      }
      throw new BookingError("Cart stays must use the same currency", "INVALID_DATES");
    }

    const bookingIds = created.map((row) => row.booking.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${appUrl}/cart/success?bookingIds=${encodeURIComponent(bookingIds.join(","))}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/cart/checkout`;

    if (isStripeConfigured()) {
      const stripe = getStripe()!;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: guestEmail,
        expires_at: Math.floor(Date.now() / 1000) + 23 * 60 * 60,
        line_items: created.map((row) => ({
          quantity: 1,
          price_data: {
            currency: row.quote.currency.toLowerCase(),
            unit_amount: toStripeAmount(row.quote.total, row.quote.currency),
            product_data: {
              name: row.title,
              description: `${row.checkIn} → ${row.checkOut} · ${row.guests} guest${row.guests === 1 ? "" : "s"}`,
            },
          },
        })),
        metadata: {
          bookingId: bookingIds[0],
          bookingIds: bookingIds.join(","),
          bookingReferences: created
            .map((row) => row.booking.bookingReference)
            .join(","),
        },
      });

      await prisma.booking.updateMany({
        where: { id: { in: bookingIds } },
        data: {
          stripeSessionId: session.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.json({
        bookings: created.map((row) => row.booking),
        bookingIds,
        mode: "stripe" as const,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    }

    if (body.demoPay) {
      const paid = [];
      for (const id of bookingIds) {
        const next = await markBookingPaid(id);
        void enqueueBookingConfirmedJob({ bookingId: next.id, guestId: next.guestId });
        paid.push(next);
      }
      return NextResponse.json({
        bookings: paid,
        bookingIds,
        mode: "demo" as const,
        paid: true,
      });
    }

    return NextResponse.json({
      bookings: created.map((row) => row.booking),
      bookingIds,
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
    console.error("Cart booking error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
