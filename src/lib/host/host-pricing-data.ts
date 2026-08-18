import { HOST_LISTINGS } from "@/lib/mock/dashboard-data";
import { getStayById } from "@/lib/mock/data";
import type { CountryPricingConfig } from "@/lib/admin/country-utils";
import type {
  ExtraCharge,
  ListingPricingSettings,
  SeasonalPrice,
} from "./host-pricing-types";
import { normalizeExtraChargeBilling } from "./host-pricing-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-host-pricing";
export const HOST_PRICING_SYNC_EVENT = "farm-stays-host-pricing-updated";

export function defaultForListing(
  listingId: string,
  country?: CountryPricingConfig
): ListingPricingSettings {
  const stay = getStayById(listingId);
  const isMain = listingId === "1";
  return {
    listingId,
    basePrice: stay?.price ?? (isMain ? 950 : 850),
    currency: country?.currency ?? "AED",
    weekendPrice: isMain ? 1200 : null,
    monthlyPrice: null,
    roomPrices: [],
    seasonalPricing: isMain
      ? [
          {
            id: "sp-peak",
            name: "Peak winter season",
            startDate: "2026-12-15",
            endDate: "2027-01-15",
            price: 1400,
          },
        ]
      : [],
    weeklyDiscountPct: 0,
    monthlyDiscountPct: 0,
    earlyBirdDiscountPct: 0,
    earlyBirdDaysAhead: 30,
    lastMinuteDiscountPct: 0,
    lastMinuteDaysAhead: 3,
    flashDealEnabled: false,
    flashDealDiscountPct: 0,
    flashDealEndsAt: null,
    extraCharges: isMain
      ? [
          {
            id: "ec-meal",
            label: "Breakfast (per person)",
            amount: 45,
            billing: "per_night" as const,
            catalogId: "ec-cat-breakfast",
          },
          {
            id: "ec-bbq",
            label: "BBQ setup",
            amount: 120,
            billing: "per_stay" as const,
            catalogId: "ec-cat-bbq",
          },
          {
            id: "ec-transport",
            label: "Airport transfer",
            amount: 200,
            billing: "per_stay" as const,
            catalogId: "ec-cat-airport",
          },
        ]
      : [],
    extraGuestCharge: 100,
    guestsIncludedInBase: 2,
    seasonalEnabled: true,
    discountsEnabled: true,
    extraChargesEnabled: true,
    taxPct: country?.taxPct ?? 5,
    taxLabel: country?.taxLabel ?? "VAT",
  };
}

/** Apply admin country currency/tax onto pricing settings. */
export function applyCountryPricing(
  settings: ListingPricingSettings,
  country: CountryPricingConfig
): ListingPricingSettings {
  return {
    ...settings,
    currency: country.currency,
    taxPct: country.taxPct,
    taxLabel: country.taxLabel,
  };
}

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_PRICING_SYNC_EVENT);
}

function readAll(): Record<string, ListingPricingSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ListingPricingSettings>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ListingPricingSettings>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

export function loadPricingSettings(
  listingId: string,
  country?: CountryPricingConfig
): ListingPricingSettings {
  const stored = readAll()[listingId];
  const base = defaultForListing(listingId, country);
  if (!stored) return base;
  const merged = {
    ...base,
    ...stored,
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

export function savePricingSettings(settings: ListingPricingSettings): void {
  const map = readAll();
  map[settings.listingId] = settings;
  writeAll(map);
}

/** Seed pricing row when a new room is added on a listing. */
export function initRoomPricing(
  listingId: string,
  roomId: string,
  basePrice: number,
  country?: CountryPricingConfig
): void {
  const settings = loadPricingSettings(listingId, country);
  if (settings.roomPrices.some((r) => r.roomId === roomId)) return;
  savePricingSettings({
    ...settings,
    roomPrices: [
      ...settings.roomPrices,
      { roomId, basePrice: Math.max(0, basePrice), weekendPrice: null, monthlyPrice: null },
    ],
  });
}

/**
 * Ensure every room on a listing has a roomPrices row (from the room's listed price).
 * Does not overwrite rates the host already set.
 * @returns true when storage was updated
 */
export function syncRoomPricesFromListing(
  listingId: string,
  rooms: { id: string; price: number }[],
  country?: CountryPricingConfig
): boolean {
  if (!rooms.length) return false;
  const settings = loadPricingSettings(listingId, country);
  let changed = false;
  const roomPrices = [...settings.roomPrices];
  for (const room of rooms) {
    if (roomPrices.some((r) => r.roomId === room.id)) continue;
    roomPrices.push({
      roomId: room.id,
      basePrice: Math.max(0, room.price),
      weekendPrice: null,
      monthlyPrice: null,
    });
    changed = true;
  }
  // Drop stale rows for rooms that no longer exist
  const roomIds = new Set(rooms.map((r) => r.id));
  const pruned = roomPrices.filter((r) => roomIds.has(r.roomId));
  if (pruned.length !== roomPrices.length) changed = true;
  if (!changed) return false;
  savePricingSettings({ ...settings, roomPrices: pruned });
  return true;
}

export function newSeasonalPriceId(): string {
  return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function newExtraChargeId(): string {
  return `ec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getListingIds(): string[] {
  const ids = new Set(HOST_LISTINGS.map((l) => l.id));
  for (const key of Object.keys(readAll())) ids.add(key);
  return Array.from(ids);
}

/**
 * After creating/editing a listing, seed pricing from the listing country and
 * (when available) copy rates from a similar listing (same country / category).
 * Does not overwrite pricing the host has already customized for this listing.
 */
export function seedPricingFromListingForm(input: {
  listingId: string;
  country?: CountryPricingConfig;
  similarListingIds?: string[];
}): ListingPricingSettings {
  const map = readAll();
  const existing = map[input.listingId];
  const alreadyCustomized = Boolean(existing);

  let base = defaultForListing(input.listingId, input.country);
  if (input.country) {
    base = applyCountryPricing(base, input.country);
  }

  if (!alreadyCustomized && input.similarListingIds?.length) {
    for (const similarId of input.similarListingIds) {
      if (similarId === input.listingId) continue;
      const similar = map[similarId];
      if (!similar) continue;
      base = {
        ...base,
        basePrice: similar.basePrice,
        weekendPrice: similar.weekendPrice,
        monthlyPrice: similar.monthlyPrice,
        weeklyDiscountPct: similar.weeklyDiscountPct,
        monthlyDiscountPct: similar.monthlyDiscountPct,
        earlyBirdDiscountPct: similar.earlyBirdDiscountPct,
        earlyBirdDaysAhead: similar.earlyBirdDaysAhead,
        lastMinuteDiscountPct: similar.lastMinuteDiscountPct,
        lastMinuteDaysAhead: similar.lastMinuteDaysAhead,
        extraGuestCharge: similar.extraGuestCharge,
        guestsIncludedInBase: similar.guestsIncludedInBase,
        extraCharges: similar.extraCharges.map((c) => ({
          ...c,
          id: newExtraChargeId(),
          billing: normalizeExtraChargeBilling(c),
        })),
        seasonalPricing: similar.seasonalPricing.map((s) => ({
          ...s,
          id: newSeasonalPriceId(),
        })),
        // Keep this listing's country currency/tax
        currency: base.currency,
        taxPct: base.taxPct,
        taxLabel: base.taxLabel,
        roomPrices: [],
      };
      break;
    }
  } else if (alreadyCustomized && input.country) {
    base = applyCountryPricing({ ...existing!, listingId: input.listingId }, input.country);
  }

  savePricingSettings(base);
  return base;
}
