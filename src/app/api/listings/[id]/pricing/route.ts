import { NextResponse } from "next/server";
import { getListingPricing, saveListingPricing } from "@/lib/server/listing-pricing-repo";
import {
  hostDataErrorResponse,
  requireListingHostOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const settings = await getListingPricing(id);
  if (!settings) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ settings });
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

    const saved = await saveListingPricing(next);
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
