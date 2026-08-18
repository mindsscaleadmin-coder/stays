import { NextResponse } from "next/server";
import { getListingAvailability, saveListingAvailability } from "@/lib/server/listing-availability-repo";
import { getBookingOccupiedDates } from "@/lib/server/booking-occupancy-repo";
import {
  hostDataErrorResponse,
  requireListingHostOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { ListingAvailabilitySettings } from "@/lib/host/host-availability-types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const settings = await getListingAvailability(id);
  if (!settings) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const occupiedDates = await getBookingOccupiedDates(id);
  const blockedDates = Array.from(
    new Set([...settings.blockedDates, ...occupiedDates])
  ).sort();
  return NextResponse.json({
    settings: { ...settings, blockedDates },
    occupiedDates,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    await requireListingHostOrAdmin(id);

    const body = (await request.json()) as Partial<ListingAvailabilitySettings>;
    const current = await getListingAvailability(id);
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const next: ListingAvailabilitySettings = {
      ...current,
      ...body,
      listingId: id,
    };

    const saved = await saveListingAvailability(next);
    return NextResponse.json(
      { settings: saved },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Save availability error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
