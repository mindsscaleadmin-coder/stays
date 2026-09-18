import { prisma } from "@/lib/prisma";
import type { CountryPricingConfig } from "@/lib/admin/country-utils";
import {
  applyCountryPricing,
  defaultForListing,
} from "@/lib/host/host-pricing-data";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import { normalizeExtraChargeBilling } from "@/lib/host/host-pricing-types";
import {
  disableExpiredFlashDeal,
  getActiveFlashDeal,
  isFlashDealExpired,
} from "@/lib/host/flash-deal-utils";
import { normalizeExperienceSessions } from "@/lib/booking/experience-session-types";

function parsePayload(raw: string): Omit<ListingPricingSettings, "listingId"> {
  return JSON.parse(raw) as Omit<ListingPricingSettings, "listingId">;
}

function resolvedBasePrice(
  stored: { basePrice?: number | null } | null,
  seed?: { basePrice?: number | null },
  fallback = 0
): number {
  if (stored?.basePrice != null && stored.basePrice > 0) return stored.basePrice;
  if (seed?.basePrice != null && seed.basePrice > 0) return seed.basePrice;
  return Math.max(0, fallback);
}

function mergeStored(
  listingId: string,
  stored: Omit<ListingPricingSettings, "listingId"> | null,
  country?: CountryPricingConfig,
  seed?: { basePrice?: number | null }
): ListingPricingSettings {
  const base = defaultForListing(listingId, country, seed);
  if (!stored) return base;
  const merged: ListingPricingSettings = {
    ...base,
    ...stored,
    listingId,
    basePrice: resolvedBasePrice(stored, seed, base.basePrice),
    roomPrices: (stored.roomPrices ?? base.roomPrices).map((r) => ({
      roomId: r.roomId,
      basePrice: r.basePrice ?? null,
      weekendPrice: r.weekendPrice ?? null,
      monthlyPrice: r.monthlyPrice ?? null,
    })),
    monthlyPrice: stored.monthlyPrice ?? base.monthlyPrice,
    seasonalEnabled: stored.seasonalEnabled ?? true,
    discountsEnabled: stored.discountsEnabled ?? true,
    extraChargesEnabled: stored.extraChargesEnabled ?? true,
    flashDealEnabled: stored.flashDealEnabled ?? false,
    flashDealDiscountPct: stored.flashDealDiscountPct ?? base.flashDealDiscountPct,
    flashDealEndsAt: stored.flashDealEndsAt ?? null,
    extraCharges: (stored.extraCharges ?? base.extraCharges).map((c) => ({
      ...c,
      billing: normalizeExtraChargeBilling(c),
    })),
    sessions: normalizeExperienceSessions(stored.sessions ?? base.sessions),
  };
  const resolved = country ? applyCountryPricing(merged, country) : merged;
  return disableExpiredFlashDeal(resolved);
}

function persistablePayload(settings: ListingPricingSettings): string {
  const { listingId, ...rest } = settings;
  void listingId;
  return JSON.stringify(rest);
}

async function persistExpiredFlashDeal(settings: ListingPricingSettings): Promise<void> {
  await prisma.listingPricing.update({
    where: { listingId: settings.listingId },
    data: { payload: persistablePayload(settings) },
  });
}

export async function getListingPricing(
  listingId: string,
  country?: CountryPricingConfig
): Promise<ListingPricingSettings | null> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return null;

  const row = await prisma.listingPricing.findUnique({ where: { listingId } });
  const stored = row ? parsePayload(row.payload) : null;
  const settings = mergeStored(listingId, stored, country, { basePrice: listing.pricePerNight });
  if (row && stored && isFlashDealExpired({ ...stored, discountsEnabled: stored.discountsEnabled ?? true })) {
    await persistExpiredFlashDeal(settings);
  }
  return settings;
}

export async function getListingPricingMap(
  listingIds: string[]
): Promise<Map<string, ListingPricingSettings>> {
  const unique = Array.from(new Set(listingIds.filter(Boolean)));
  const map = new Map<string, ListingPricingSettings>();
  if (unique.length === 0) return map;

  const listings = await prisma.listing.findMany({
    where: { id: { in: unique } },
    select: { id: true, pricePerNight: true },
  });
  const rows = await prisma.listingPricing.findMany({
    where: { listingId: { in: unique } },
  });
  const payloadById = new Map(rows.map((r) => [r.listingId, parsePayload(r.payload)]));

  const expired: ListingPricingSettings[] = [];
  for (const listing of listings) {
    const settings = mergeStored(listing.id, payloadById.get(listing.id) ?? null, undefined, {
      basePrice: listing.pricePerNight,
    });
    map.set(listing.id, settings);
    const stored = payloadById.get(listing.id);
    if (stored && isFlashDealExpired({ ...stored, discountsEnabled: stored.discountsEnabled ?? true })) {
      expired.push(settings);
    }
  }
  if (expired.length > 0) {
    await Promise.all(expired.map((settings) => persistExpiredFlashDeal(settings)));
  }
  return map;
}

/** Turn off flash deals whose end time has passed so they leave the homepage. */
export async function expireEndedFlashDeals(now = new Date()): Promise<number> {
  const rows = await prisma.listingPricing.findMany();
  let count = 0;
  for (const row of rows) {
    const stored = parsePayload(row.payload);
    if (!isFlashDealExpired({ ...stored, discountsEnabled: stored.discountsEnabled ?? true }, now)) {
      continue;
    }
    await prisma.listingPricing.update({
      where: { listingId: row.listingId },
      data: { payload: JSON.stringify({ ...stored, flashDealEnabled: false }) },
    });
    count += 1;
  }
  return count;
}

export async function saveListingPricing(
  settings: ListingPricingSettings
): Promise<ListingPricingSettings> {
  const { listingId, ...rest } = settings;
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");

  const toStore = disableExpiredFlashDeal({ listingId, ...rest });
  const { listingId: storedListingId, ...payload } = toStore;
  void storedListingId;
  await prisma.listingPricing.upsert({
    where: { listingId },
    create: { listingId, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });

  if (rest.basePrice != null) {
    let nextPayload = listing.payload;
    try {
      const parsed = JSON.parse(listing.payload) as Record<string, unknown>;
      nextPayload = JSON.stringify({ ...parsed, pricePerNight: rest.basePrice });
    } catch {
      nextPayload = listing.payload;
    }
    await prisma.listing.update({
      where: { id: listingId },
      data: { pricePerNight: rest.basePrice, payload: nextPayload },
    });
  }

  return toStore;
}

/** Copy a live base rate + active flash deal onto listing rows used by search / My Listings. */
export async function attachPricingToListings<
  T extends {
    id: string;
    pricePerNight?: number | null;
    flashDealEndsAt?: string | null;
    flashDealDiscountPct?: number;
    flashDealCurrency?: string;
  },
>(listings: T[]): Promise<T[]> {
  const map = await getListingPricingMap(listings.map((listing) => listing.id));
  return listings.map((listing) => {
    const settings = map.get(listing.id);
    const rate =
      settings && settings.basePrice > 0 ? settings.basePrice : listing.pricePerNight;
    const deal = settings ? getActiveFlashDeal(settings) : null;
    return {
      ...listing,
      pricePerNight: rate ?? listing.pricePerNight,
      flashDealEndsAt: deal?.endsAt ?? null,
      flashDealDiscountPct: deal?.discountPct,
      flashDealCurrency: deal?.currency,
    };
  });
}
