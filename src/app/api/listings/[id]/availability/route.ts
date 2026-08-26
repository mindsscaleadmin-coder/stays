import { NextResponse } from "next/server";
import {
  ensureListingIcalToken,
  getListingAvailability,
  saveListingAvailability,
} from "@/lib/server/listing-availability-repo";
import { getBookingOccupiedDates } from "@/lib/server/booking-occupancy-repo";
import {
  hostDataErrorResponse,
  requireListingHostOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError, isDemoApiMode } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { ListingAvailabilitySettings } from "@/lib/host/host-availability-types";
import { assertPublicHttpsCalendarUrl } from "@/lib/server/ical-fetch";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const channel = new URL(request.url).searchParams.get("channel") === "1";
  if (channel && !isDemoApiMode()) {
    try {
      await requireListingHostOrAdmin(id);
    } catch (error) {
      if (error instanceof AuthError || error instanceof BookingAccessError) {
        return hostDataErrorResponse(error);
      }
      throw error;
    }
  }

  const settings = channel
    ? await ensureListingIcalToken(id)
    : await getListingAvailability(id);
  if (!settings) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const occupiedDates = await getBookingOccupiedDates(id);
  const imported = settings.icalImportedDates ?? [];
  // Booked nights must never live in blockedDates — persist would lock them forever.
  const blockedDates = settings.blockedDates.filter((d) => !occupiedDates.includes(d));
  const publicSettings = channel
    ? { ...settings, blockedDates }
    : {
        ...settings,
        blockedDates,
        icalToken: undefined,
        icalFeeds: undefined,
        // Guest date picker: imported + booked nights look unavailable, without
        // writing those dates back as host manual blocks.
        icalImportedDates: Array.from(new Set([...imported, ...occupiedDates])).sort(),
      };
  return NextResponse.json({
    settings: publicSettings,
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

    const feeds = body.icalFeeds ?? current.icalFeeds;
    for (const feed of feeds ?? []) {
      assertPublicHttpsCalendarUrl(feed.url);
    }

    const occupiedDates = await getBookingOccupiedDates(id);
    const requestedBlocks = body.blockedDates ?? current.blockedDates;
    const next: ListingAvailabilitySettings = {
      ...current,
      ...body,
      listingId: id,
      icalToken: current.icalToken,
      icalFeeds: feeds,
      // Imported dates are written only by /sync — never by a host form persist.
      icalImportedDates: current.icalImportedDates,
      blockedDates: requestedBlocks.filter((d) => !occupiedDates.includes(d)),
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
    if (error instanceof Error && /calendar url|https:\/\/|not allowed|valid calendar/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Save availability error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
