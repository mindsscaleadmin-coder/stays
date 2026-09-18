import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ListingAvailabilitySettings,
  ListingIcalFeed,
} from "@/lib/host/host-availability-types";
import { bookingRulesViolation, isDateUnavailable } from "@/lib/host/host-availability-utils";
import { fetchExternalIcalDates } from "@/lib/server/ical-fetch";

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
    icalImportedDates: [],
    icalFeeds: [],
  };
}

export function newIcalToken() {
  return randomBytes(18).toString("base64url");
}

export async function ensureListingIcalToken(
  listingId: string
): Promise<ListingAvailabilitySettings | null> {
  const settings = await getListingAvailability(listingId);
  if (!settings) return null;
  if (settings.icalToken) return settings;
  return saveListingAvailability({ ...settings, icalToken: newIcalToken() });
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
    icalImportedDates: stored.icalImportedDates ?? [],
    icalFeeds: stored.icalFeeds ?? [],
    icalToken: stored.icalToken,
  };
}

export async function getListingAvailability(
  listingId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<ListingAvailabilitySettings | null> {
  const listing = await client.listing.findUnique({ where: { id: listingId } });
  if (!listing) return null;

  const row = await client.listingAvailabilityMeta.findUnique({ where: { listingId } });
  const stored = row ? parsePayload(row.payload) : null;
  return mergeStored(listingId, stored);
}

export async function saveListingAvailability(
  settings: ListingAvailabilitySettings
): Promise<ListingAvailabilitySettings> {
  const { listingId } = settings;

  return prisma.$transaction(async (tx) => {
    // Same listing lock as confirmBooking — host blocks cannot interleave with a checkout.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE
    `;
    if (locked.length === 0) throw new Error("Listing not found");

    const existing = await tx.listingAvailabilityMeta.findUnique({ where: { listingId } });
    let existingToken: string | undefined;
    try {
      existingToken = existing
        ? (JSON.parse(existing.payload) as { icalToken?: string }).icalToken
        : undefined;
    } catch {
      existingToken = undefined;
    }

    const next: ListingAvailabilitySettings = {
      ...settings,
      listingId,
      icalToken: existingToken || settings.icalToken || newIcalToken(),
      icalFeeds: settings.icalFeeds ?? [],
      icalImportedDates: settings.icalImportedDates ?? [],
    };
    const { listingId: storedListingId, ...rest } = next;
    void storedListingId;

    await tx.listingAvailabilityMeta.upsert({
      where: { listingId },
      create: { listingId, payload: JSON.stringify(rest) },
      update: { payload: JSON.stringify(rest) },
    });

    await syncHostBlockedDates(listingId, next.blockedDates, tx);
    return next;
  });
}

/** Sync host manual blocks to Availability rows (booking blocks managed separately). */
async function syncHostBlockedDates(
  listingId: string,
  blockedDates: string[],
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const wanted = new Set(blockedDates);

  const existing = await client.availability.findMany({
    where: { listingId, isBlocked: true },
  });

  for (const iso of Array.from(wanted)) {
    const date = new Date(`${iso}T12:00:00`);
    await client.availability.upsert({
      where: { listingId_date: { listingId, date } },
      create: { listingId, date, isBlocked: true },
      update: { isBlocked: true },
    });
  }

  for (const row of existing) {
    const iso = row.date.toISOString().slice(0, 10);
    if (!wanted.has(iso)) {
      const hasBooking = await client.booking.findFirst({
        where: {
          listingId,
          status: { in: ["pending", "confirmed"] },
          checkIn: { lte: row.date },
          OR: [{ checkOut: { gt: row.date } }, { checkOut: null }],
        },
      });
      if (!hasBooking) {
        await client.availability.delete({ where: { id: row.id } }).catch(() => null);
      }
    }
  }
}

export async function syncListingIcalFeeds(
  listingId: string
): Promise<ListingAvailabilitySettings> {
  const current = await ensureListingIcalToken(listingId);
  if (!current) throw new Error("Listing not found");

  const feeds: ListingIcalFeed[] = [];
  const imported = new Set<string>();
  for (const feed of current.icalFeeds ?? []) {
    try {
      const dates = await fetchExternalIcalDates(feed.url);
      for (const date of dates) imported.add(date);
      feeds.push({
        ...feed,
        lastSyncedAt: new Date().toISOString(),
        lastError: undefined,
      });
    } catch (error) {
      feeds.push({
        ...feed,
        lastError: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }

  return saveListingAvailability({
    ...current,
    icalFeeds: feeds,
    icalImportedDates: Array.from(imported).sort(),
    lastIcalImportAt: new Date().toISOString(),
  });
}

/** Used by confirmBooking to reject unavailable dates from shared store. */
export async function assertDatesAvailableForListing(
  listingId: string,
  checkIn: Date,
  checkOut: Date,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const settings = await getListingAvailability(listingId, client);
  if (!settings) return;

  const checkInIso = checkIn.toISOString().slice(0, 10);
  const checkOutIso = checkOut.toISOString().slice(0, 10);
  const ruleError = bookingRulesViolation(checkInIso, checkOutIso, settings);
  if (ruleError) {
    throw new Error(ruleError);
  }

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
