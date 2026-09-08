import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { confirmPaidFromStripe } from "@/lib/stripe/confirm-payment";
import { BookingError } from "@/lib/booking/confirm-booking";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 400 });
  }

  const stripe = getStripe()!;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    const rawBody = await request.text();
    if (secret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } else {
      event = JSON.parse(rawBody);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Webhook secret required" }, { status: 400 });
      }
    }
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as {
        id?: string;
        metadata?: { bookingId?: string; bookingIds?: string; promotionId?: string };
      };
      if (session.metadata?.promotionId) {
        const { activatePromotionInDb } = await import("@/lib/listings/promotions-repo");
        await activatePromotionInDb(session.metadata.promotionId, session.id ?? "");
      }
      const bookingIds = Array.from(
        new Set(
          (session.metadata?.bookingIds || session.metadata?.bookingId || "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        )
      );
      for (const bookingId of bookingIds) {
        await confirmPaidFromStripe({
          bookingId,
          sessionId: session.id,
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
