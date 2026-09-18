import { HOST_LISTINGS } from "@/lib/mock/dashboard-data";
import type { CountryPricingConfig } from "@/lib/admin/country-utils";
import type {
  ExtraCharge,
  ListingPricingSettings,
  SeasonalPrice,
} from "./host-pricing-types";
import { normalizeExtraChargeBilling } from "./host-pricing-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";
import { LAUNCH_CURRENCY, LAUNCH_TAX_LABEL, LAUNCH_TAX_PCT } from "@/lib/tax/launch-market";

const STORAGE_KEY = "farm-stays-host-pricing";
export const HOST_PRICING_SYNC_EVENT = "farm-stays-host-pricing-updated";

export function defaultForListing(
  listingId: string,
  country?: CountryPricingConfig,
  seed?: { basePrice?: number | null }
): ListingPricingSettings {
  return {
    listingId,
    basePrice: Math.max(0, seed?.basePrice ?? 0),
    currency: country?.currency ?? LAUNCH_CURRENCY,
    weekendPrice: null,
    monthlyPrice: null,
    roomPrices: [],
    seasonalPricing: [],
    weeklyDiscountPct: 0,
    monthlyDiscountPct: 0,
    earlyBirdDiscountPct: 0,
    earlyBirdDaysAhead: 30,
    lastMinuteDiscountPct: 0,
    lastMinuteDaysAhead: 3,
    flashDealEnabled: false,
    flashDealDiscountPct: 0,
    flashDealEndsAt: null,
    extraCharges: [],
    extraGuestCharge: 0,
    guestsIncludedInBase: 2,
    seasonalEnabled: true,
    discountsEnabled: true,
    extraChargesEnabled: true,
    taxPct: country?.taxPct ?? LAUNCH_TAX_PCT,
    taxLabel: country?.taxLabel ?? LAUNCH_TAX_LABEL,
    sessions: [],
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

/** Keep a typed local rate when the shared store still has an empty default. */
export function preferStoredRateIfPublishedEmpty(
  published: ListingPricingSettings | null,
  stored: ListingPricingSettings
): { settings: ListingPricingSettings; shouldPersist: boolean } {
  const storedHasSessions = (stored.sessions?.length ?? 0) > 0;
  const storedHasRate = stored.basePrice > 0;

  if (!published) {
    return {
      settings: stored,
      shouldPersist: storedHasRate || storedHasSessions,
    };
  }

  const publishedHasSessions = (published.sessions?.length ?? 0) > 0;
  const needRate = published.basePrice <= 0 && storedHasRate;
  const needSessions = !publishedHasSessions && storedHasSessions;

  if (!needRate && !needSessions) {
    return { settings: published, shouldPersist: false };
  }

  return {
    settings: {
      ...published,
      ...(needRate
        ? {
            basePrice: stored.basePrice,
            weekendPrice: stored.weekendPrice,
            monthlyPrice: stored.monthlyPrice,
            weeklyDiscountPct: stored.weeklyDiscountPct,
            monthlyDiscountPct: stored.monthlyDiscountPct,
            earlyBirdDiscountPct: stored.earlyBirdDiscountPct,
            earlyBirdDaysAhead: stored.earlyBirdDaysAhead,
            lastMinuteDiscountPct: stored.lastMinuteDiscountPct,
            lastMinuteDaysAhead: stored.lastMinuteDaysAhead,
            extraGuestCharge: stored.extraGuestCharge,
            guestsIncludedInBase: stored.guestsIncludedInBase,
            extraCharges: stored.extraCharges,
            seasonalPricing: stored.seasonalPricing,
            roomPrices: stored.roomPrices,
          }
        : {}),
      ...(needSessions ? { sessions: stored.sessions } : {}),
      listingId: published.listingId,
    },
    shouldPersist: true,
  };
}

/** True when this browser has saved pricing for the listing (not just defaults). */
export function hasStoredPricing(listingId: string): boolean {
  return Boolean(readAll()[listingId]);
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
 * When the shared DB is on, also PATCHes so experience sessions reach guests.
 */
export async function seedPricingFromListingForm(input: {
  listingId: string;
  country?: CountryPricingConfig;
  similarListingIds?: string[];
  seedSessions?: ListingPricingSettings["sessions"];
  /** When set, wins over similar-listing copy for the base nightly rate. */
  initialBasePrice?: number | null;
}): Promise<ListingPricingSettings> {
  const map = readAll();
  const existing = map[input.listingId];
  const alreadyCustomized = Boolean(existing);

  let base = defaultForListing(input.listingId, input.country);
  if (input.country) {
    base = applyCountryPricing(base, input.country);
  }
  if (input.seedSessions?.length) {
    base = { ...base, sessions: input.seedSessions };
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
        // Keep this listing's country currency/tax + seeded sessions
        currency: base.currency,
        taxPct: base.taxPct,
        taxLabel: base.taxLabel,
        sessions: base.sessions,
        roomPrices: [],
      };
      break;
    }
  } else if (alreadyCustomized && input.country) {
    base = applyCountryPricing({ ...existing!, listingId: input.listingId }, input.country);
  }

  if (input.seedSessions?.length && !(existing?.sessions?.length)) {
    base = { ...base, sessions: input.seedSessions };
  }

  if (input.initialBasePrice != null && input.initialBasePrice > 0) {
    base = { ...base, basePrice: Math.max(0, input.initialBasePrice) };
  }

  savePricingSettings(base);

  if (typeof window !== "undefined") {
    try {
      const { savePricingToApi, shouldUseSharedPricingStore } = await import(
        "./host-pricing-api"
      );
      if (shouldUseSharedPricingStore()) {
        const saved = await savePricingToApi(base);
        savePricingSettings(saved);
        return saved;
      }
    } catch {
      // Keep local seed; Pricing page can still push on first edit.
    }
  }

  return base;
}
