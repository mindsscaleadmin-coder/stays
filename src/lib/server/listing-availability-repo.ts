import { prisma } from "@/lib/prisma";
import type { ListingAvailabilitySettings } from "@/lib/host/host-availability-types";
import { isDateUnavailable } from "@/lib/host/host-availability-utils";

const DEFAULT_SEASONAL = [
  {
    id: "season-harvest",
    name: "Harvest season — high demand",
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    closed: false,
    note: "Minimum stay may apply. Book early for farm tours.",
  },
];

function defaultForListing(listingId: string): ListingAvailabilitySettings {
  return {
    listingId,
    blockedDates: [],
    seasonalPeriods:
      listingId === "1" || listingId === "7"
        ? DEFAULT_SEASONAL.map((s) => ({ ...s }))
        : [],
    minStayNights: listingId === "9" ? 1 : 2,
    advanceNoticeDays: 1,
  };
}

function parsePayload(raw: string): Omit<ListingAvailabilitySettings, "listingId"> {
  return JSON.parse(raw) as Omit<ListingAvailabilitySettings, "listingId">;
}

function mergeStored(
  listingId: string,
  stored: Omit<ListingAvailabilitySettings, "listingId"> | null
): ListingAvailabilitySettings {
  const defaults = defaultForListing(listingId);
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    listingId,
    seasonalPeriods: (
      stored.seasonalPeriods?.length > 0 ? stored.seasonalPeriods : defaults.seasonalPeriods
    ).filter((p) => p.id !== "season-monsoon"),
  };
}

export async function getListingAvailability(
  listingId: string
): Promise<ListingAvailabilitySettings | null> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return null;

  const row = await prisma.listingAvailabilityMeta.findUnique({ where: { listingId } });
  const stored = row ? parsePayload(row.payload) : null;
  return mergeStored(listingId, stored);
}

export async function saveListingAvailability(
  settings: ListingAvailabilitySettings
): Promise<ListingAvailabilitySettings> {
  const { listingId, ...rest } = settings;
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");

  await prisma.listingAvailabilityMeta.upsert({
    where: { listingId },
    create: { listingId, payload: JSON.stringify(rest) },
    update: { payload: JSON.stringify(rest) },
  });

  await syncHostBlockedDates(listingId, settings.blockedDates);
  return settings;
}

/** Sync host manual blocks to Availability rows (booking blocks managed separately). */
async function syncHostBlockedDates(listingId: string, blockedDates: string[]) {
  const wanted = new Set(blockedDates);

  const existing = await prisma.availability.findMany({
    where: { listingId, isBlocked: true },
  });

  for (const iso of Array.from(wanted)) {
    const date = new Date(`${iso}T12:00:00`);
    await prisma.availability.upsert({
      where: { listingId_date: { listingId, date } },
      create: { listingId, date, isBlocked: true },
      update: { isBlocked: true },
    });
  }

  for (const row of existing) {
    const iso = row.date.toISOString().slice(0, 10);
    if (!wanted.has(iso)) {
      const hasBooking = await prisma.booking.findFirst({
        where: {
          listingId,
          status: { in: ["pending", "confirmed"] },
          checkIn: { lte: row.date },
          OR: [{ checkOut: { gt: row.date } }, { checkOut: null }],
        },
      });
      if (!hasBooking) {
        await prisma.availability.delete({ where: { id: row.id } }).catch(() => null);
      }
    }
  }
}

/** Used by confirmBooking to reject unavailable dates from shared store. */
export async function assertDatesAvailableForListing(
  listingId: string,
  checkIn: Date,
  checkOut: Date
) {
  const settings = await getListingAvailability(listingId);
  if (!settings) return;

  const cursor = new Date(checkIn);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);

  while (cursor < end) {
    const iso = cursor.toISOString().slice(0, 10);
    if (isDateUnavailable(iso, settings)) {
      throw new Error("UNAVAILABLE");
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}
