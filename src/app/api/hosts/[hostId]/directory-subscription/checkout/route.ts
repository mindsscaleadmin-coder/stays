import { NextResponse } from "next/server";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import { EVENTS_SUBSCRIPTION_CURRENCY } from "@/lib/admin/events-subscription";
import { getStripe, isStripeConfigured, toStripeAmount } from "@/lib/stripe/server";
import {
  loadDirectorySubscriptionSettings,
  resolveGrantVerticalFromPlanId,
  resolvePlanFee,
} from "@/lib/server/directory-subscription-grant";
import { getHostProfile } from "@/lib/server/host-profile-repo";
import { defaultHostPublicProfile } from "@/lib/host/host-profile-data";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Online payment is not configured. Contact support to pay offline." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { planId?: string };
    const profile = (await getHostProfile(hostId)) ?? defaultHostPublicProfile(hostId);
    const planId = body.planId?.trim() || profile.preferredDirectoryPlanId?.trim() || "events-single";
    const settings = await loadDirectorySubscriptionSettings();
    const amount = resolvePlanFee(planId, settings);

    if (amount <= 0) {
      return NextResponse.json({ error: "Invalid subscription plan" }, { status: 400 });
    }

    const vertical = resolveGrantVerticalFromPlanId(planId);
    const planName =
      planId === "combo"
        ? settings.comboOffer?.name ?? "Events + Dining combo"
        : settings.eventsPlans.find((p) => p.id === planId)?.name ??
          settings.diningPlans.find((p) => p.id === planId)?.name ??
          "Directory subscription";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const stripe = getStripe()!;
    const currency = EVENTS_SUBSCRIPTION_CURRENCY.toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}/host/listings?directoryPaid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/host/listings?directoryCanceled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 23 * 60 * 60,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: toStripeAmount(amount, EVENTS_SUBSCRIPTION_CURRENCY),
            product_data: {
              name: `${planName} · 1 year`,
              description: `Directory subscription (${vertical})`,
            },
          },
        },
      ],
      metadata: {
        directorySubscriptionHostId: hostId,
        directorySubscriptionPlanId: planId,
      },
    });

    return NextResponse.json(
      { checkoutUrl: session.url, sessionId: session.id, planId, amount },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Directory subscription checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
