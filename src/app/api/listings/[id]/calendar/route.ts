import { NextResponse } from "next/server";
import { ensureListingIcalToken } from "@/lib/server/listing-availability-repo";
import { getBookingOccupiedDates } from "@/lib/server/booking-occupancy-repo";
import { prisma } from "@/lib/prisma";
import { exportAvailabilityIcal } from "@/lib/host/ical-utils";
import { expandSeasonalClosedDates } from "@/lib/host/host-availability-utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";
  const settings = await ensureListingIcalToken(id);
  if (!settings || !settings.icalToken || token !== settings.icalToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { title: true },
  });
  const title = listing?.title || id;
  const occupied = await getBookingOccupiedDates(id);
  const seasonal = expandSeasonalClosedDates(settings.seasonalPeriods);
  const events = [
    ...occupied.map((date) => ({ date, summary: "Booked", uid: `booked-${date}` })),
    ...settings.blockedDates.map((date) => ({
      date,
      summary: "Blocked",
      uid: `blocked-${date}`,
    })),
    ...seasonal.map((date) => ({
      date,
      summary: "Closed",
      uid: `closed-${date}`,
    })),
  ];

  const body = exportAvailabilityIcal(title, events);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id}-calendar.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
