import { prisma } from "@/lib/prisma";
import type { CountryPricingConfig } from "@/lib/admin/country-utils";
import {
  applyCountryPricing,
  defaultForListing,
} from "@/lib/host/host-pricing-data";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import { normalizeExtraChargeBilling } from "@/lib/host/host-pricing-types";

function parsePayload(raw: string): Omit<ListingPricingSettings, "listingId"> {
  return JSON.parse(raw) as Omit<ListingPricingSettings, "listingId">;
}

function mergeStored(
  listingId: string,
  stored: Omit<ListingPricingSettings, "listingId"> | null,
  country?: CountryPricingConfig
): ListingPricingSettings {
  const base = defaultForListing(listingId, country);
  if (!stored) return base;
  const merged: ListingPricingSettings = {
    ...base,
    ...stored,
    listingId,
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
  };
  return country ? applyCountryPricing(merged, country) : merged;
}

export async function getListingPricing(
  listingId: string,
  country?: CountryPricingConfig
): Promise<ListingPricingSettings | null> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return null;

  const row = await prisma.listingPricing.findUnique({ where: { listingId } });
  const stored = row ? parsePayload(row.payload) : null;
  return mergeStored(listingId, stored, country);
}

export async function saveListingPricing(
  settings: ListingPricingSettings
): Promise<ListingPricingSettings> {
  const { listingId, ...rest } = settings;
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");

  await prisma.listingPricing.upsert({
    where: { listingId },
    create: { listingId, payload: JSON.stringify(rest) },
    update: { payload: JSON.stringify(rest) },
  });

  if (rest.basePrice != null) {
    await prisma.listing.update({
      where: { id: listingId },
      data: { pricePerNight: rest.basePrice },
    });
  }

  return settings;
}
