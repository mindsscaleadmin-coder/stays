import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { normalizeExperienceSessions } from "@/lib/booking/experience-session-types";
import { experienceSlotDate, experienceSlotDateIso } from "@/lib/booking/experience-slot-date";
import { isExperienceListing } from "@/lib/booking/is-experience-listing";

function eachDateIso(from: string, to: string): string[] {
  const out: string[] = [];
  const start = experienceSlotDate(from);
  const end = experienceSlotDate(to);
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
    out.push(experienceSlotDateIso(new Date(t)));
  }
  return out;
}

/**
 * Read-only availability for experience sessions across a date range.
 * Does not upsert slots — bookedCount comes from existing ExperienceSlot rows.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await context.params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || from;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "from and to must be YYYY-MM-DD" }, { status: 400 });
  }
  if (to < from) {
    return NextResponse.json({ error: "to must be on or after from" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  let payloadType = "";
  try {
    payloadType = (JSON.parse(listing.payload) as { type?: string }).type ?? "";
  } catch {
    // ignore
  }
  if (
    !isExperienceListing({
      parentCategory: listing.parentCategory,
      type: payloadType,
    })
  ) {
    return NextResponse.json({ error: "Not an experience listing" }, { status: 400 });
  }

  const pricing = await getListingPricing(listingId);
  const sessions = normalizeExperienceSessions(pricing?.sessions);
  if (sessions.length === 0) {
    return NextResponse.json({
      listingId,
      sessions: [],
      slots: [],
      currency: pricing?.currency,
    });
  }

  const dates = eachDateIso(from, to).slice(0, 62);
  const dateObjs = dates.map(experienceSlotDate);

  const existing = await prisma.experienceSlot.findMany({
    where: {
      listingId,
      date: { in: dateObjs },
    },
  });

  const byKey = new Map(
    existing.map((row) => [`${experienceSlotDateIso(row.date)}:${row.sessionKey}`, row])
  );

  const slots = dates.flatMap((dateIso) =>
    sessions.map((session) => {
      const row = byKey.get(`${dateIso}:${session.key}`);
      const capacity = row?.capacity ?? session.capacity;
      const bookedCount = row?.bookedCount ?? 0;
      return {
        date: dateIso,
        sessionKey: session.key,
        label: session.label,
        startTime: session.startTime,
        endTime: session.endTime,
        capacity,
        bookedCount,
        spotsLeft: Math.max(0, capacity - bookedCount),
        priceMode: session.priceMode,
        price: session.price,
      };
    })
  );

  return NextResponse.json({
    listingId,
    sessions,
    slots,
    currency: pricing?.currency,
    taxPct: pricing?.taxPct,
    taxLabel: pricing?.taxLabel,
  });
}
