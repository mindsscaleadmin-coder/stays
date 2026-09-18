import { NextResponse } from "next/server";
import {
  setListingFeaturedInDb,
  listPromotionsForListing,
  listPromotionsForHost,
  purchasePromotionInDb,
  activatePromotionInDb,
} from "@/lib/listings/promotions-repo";
import { requireHostSelfOrAdmin, assertListingHostOrAdmin, hostDataErrorResponse } from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { requireActor, requireAdmin } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import { getStripe, isStripeConfigured, toStripeAmount } from "@/lib/stripe/server";
import { getPromotionCatalogSettings } from "@/lib/server/promotion-catalog-repo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const hostId = searchParams.get("hostId");

  try {
    if (listingId) {
      const promotions = await listPromotionsForListing(listingId);
      return NextResponse.json({ promotions });
    }

    if (hostId) {
      await requireHostSelfOrAdmin(hostId);
      const promotions = await listPromotionsForHost(hostId);
      return NextResponse.json({ promotions });
    }

    return NextResponse.json(
      { error: "listingId or hostId query param required" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const json = await request.json();

    if (json.action === "setFeatured") {
      const actor = await requireAdmin();
      const result = await setListingFeaturedInDb({
        listingId: String(json.listingId),
        hostId: String(json.hostId || actor.id),
        featured: Boolean(json.featured),
        title: typeof json.title === "string" ? json.title : undefined,
      });
      return NextResponse.json(result);
    }

    if (json.action === "confirm") {
      const actor = await requireActor();
      const promotionId = String(json.promotionId || "");
      const sessionId = typeof json.sessionId === "string" ? json.sessionId : "";
      const promo = await prisma.listingPromotion.findUnique({ where: { id: promotionId } });
      if (!promo) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await assertListingHostOrAdmin(promo.listingId, actor);
      if (promo.status === "active") {
        return NextResponse.json({ promotion: promo });
      }
      if (!isStripeConfigured() || !sessionId) {
        return NextResponse.json({ error: "Payment not confirmed" }, { status: 409 });
      }
      const stripe = getStripe()!;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.promotionId !== promotionId) {
        return NextResponse.json({ error: "Session does not match promotion" }, { status: 409 });
      }
      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        return NextResponse.json({ error: "Payment incomplete" }, { status: 409 });
      }
      const saved = await activatePromotionInDb(promotionId, session.id);
      return NextResponse.json({ promotion: saved });
    }

    if (json.action === "purchase") {
      const actor = await requireActor();
      const listingId = String(json.listingId || "");
      const hostId = String(json.hostId || actor.staffHostId || actor.id);
      await assertListingHostOrAdmin(listingId, actor);

      const stripeOn = isStripeConfigured();
      const saved = await purchasePromotionInDb({
        listingId,
        hostId,
        kind: json.kind,
        durationDays: json.durationDays,
        listingTitle: typeof json.listingTitle === "string" ? json.listingTitle : undefined,
        activate: !stripeOn,
      });
      if (!saved) {
        return NextResponse.json({ error: "Invalid promotion package" }, { status: 400 });
      }

      if (!stripeOn) {
        return NextResponse.json({ promotion: saved });
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const stripe = getStripe()!;
      const catalog = await getPromotionCatalogSettings();
      const currency = catalog.currency.toLowerCase();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${appUrl}/host/promote?listingId=${encodeURIComponent(listingId)}&promoId=${saved.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/host/promote?listingId=${encodeURIComponent(listingId)}&canceled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 23 * 60 * 60,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: toStripeAmount(saved.priceAed, catalog.currency),
              product_data: {
                name: `${saved.kind === "featured" ? "Featured" : "Trending"} · ${saved.durationDays} days`,
                description: saved.listingId,
              },
            },
          },
        ],
        metadata: { promotionId: saved.id, listingId, hostId },
      });

      await prisma.listingPromotion.update({
        where: { id: saved.id },
        data: { paymentRef: session.id },
      });

      return NextResponse.json({
        promotion: { ...saved, paymentRef: session.id, status: "pending" },
        checkoutUrl: session.url,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Promotion save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save promotion" },
      { status: 500 }
    );
  }
}
