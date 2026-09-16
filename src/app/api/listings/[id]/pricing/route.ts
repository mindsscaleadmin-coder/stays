import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getListingPricing, saveListingPricing } from "@/lib/server/listing-pricing-repo";
import {
  hostDataErrorResponse,
  requireListingHostOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import { normalizeExperienceSessions } from "@/lib/booking/experience-session-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { id } = await context.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Draft/pending listings: host-only. Approved listings stay public for checkout quotes.
    if (listing.status !== "approved") {
      await requireListingHostOrAdmin(id);
    }
    const settings = await getListingPricing(id);
    if (!settings) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Get pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    await requireListingHostOrAdmin(id);

    const body = (await request.json()) as Partial<ListingPricingSettings>;
    const current = await getListingPricing(id);
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const next: ListingPricingSettings = {
      ...current,
      ...body,
      listingId: id,
      seasonalEnabled:
        body.seasonalEnabled !== undefined
          ? Boolean(body.seasonalEnabled)
          : current.seasonalEnabled,
      discountsEnabled:
        body.discountsEnabled !== undefined
          ? Boolean(body.discountsEnabled)
          : current.discountsEnabled,
      extraChargesEnabled:
        body.extraChargesEnabled !== undefined
          ? Boolean(body.extraChargesEnabled)
          : current.extraChargesEnabled,
    };

    if (body.sessions !== undefined) {
      next.sessions = normalizeExperienceSessions(body.sessions);
    }

    const saved = await saveListingPricing(next);

    const sessions = normalizeExperienceSessions(saved.sessions);
    if (sessions.length > 0) {
      const maxCap = Math.max(1, ...sessions.map((s) => s.capacity));
      await prisma.listing.update({
        where: { id },
        data: { maxGuests: maxCap },
      });
    }

    return NextResponse.json(
      { settings: saved },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Save pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
