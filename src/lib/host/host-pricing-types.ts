import type { ExtraChargeBilling } from "@/lib/admin/extra-charges-catalog-types";
import type { ExperienceSessionTemplate } from "@/lib/booking/experience-session-types";

export type { ExperienceSessionTemplate, ExperiencePriceMode } from "@/lib/booking/experience-session-types";

export interface ListingPricingSettings {
  listingId: string;

  /** Property-level nightly rate — used when the listing has no room types */
  basePrice: number;
  currency: string;

  /**
   * Experience listings: named session templates (Morning/Evening/…).
   * Stay listings leave this empty/undefined.
   */
  sessions?: ExperienceSessionTemplate[];

  /** Weekend premium (Fri & Sat nights) — property-level fallback */
  weekendPrice: number | null;

  /**
   * Monthly / long-stay nightly rate (28+ night stays).
   * When set, replaces base/weekend for qualifying stays (seasonal still wins).
   */
  monthlyPrice: number | null;

  /** Per-room / unit rates for multi-room listings */
  roomPrices: RoomPricing[];

  /** Seasonal pricing windows (active only between startDate and endDate) */
  seasonalPricing: SeasonalPrice[];

  /** Discounts — apply on top of base/room rate when no seasonal rate is active */
  weeklyDiscountPct: number;
  monthlyDiscountPct: number;
  earlyBirdDiscountPct: number;
  earlyBirdDaysAhead: number;
  lastMinuteDiscountPct: number;
  lastMinuteDaysAhead: number;

  /**
   * Last flash deal — time-boxed promo featured on the homepage.
   * When enabled and not expired, guests see it under Flash Deals and get this % off.
   */
  flashDealEnabled: boolean;
  flashDealDiscountPct: number;
  /** ISO datetime when the flash deal ends (required when enabled) */
  flashDealEndsAt: string | null;

  /** Extra charges */
  extraCharges: ExtraCharge[];

  /** Extra guest surcharge after N guests included in base price */
  extraGuestCharge: number;
  guestsIncludedInBase: number;

  /** Host can turn optional pricing boxes off for this listing */
  seasonalEnabled: boolean;
  discountsEnabled: boolean;
  extraChargesEnabled: boolean;

  /** Tax */
  taxPct: number;
  taxLabel: string;
}

/** Nightly rates for one room/unit on a multi-room property. */
export interface RoomPricing {
  roomId: string;
  /** Nightly rate for this room; falls back to listing basePrice when unset */
  basePrice: number | null;
  /** Weekend rate for this room; falls back to listing weekendPrice / room base */
  weekendPrice: number | null;
  /** Monthly long-stay rate; falls back to listing monthlyPrice / room base */
  monthlyPrice: number | null;
}

export interface SeasonalPrice {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  price: number;
}

export interface ExtraCharge {
  id: string;
  label: string;
  amount: number;
  billing: ExtraChargeBilling;
  /** When set, this charge was added from an admin catalog template */
  catalogId?: string;
  /** When set, linked to the host's saved extras library */
  libraryId?: string;
  /** @deprecated prefer billing */
  perNight?: boolean;
}

export function normalizeExtraChargeBilling(
  charge: Pick<ExtraCharge, "billing" | "perNight">
): ExtraChargeBilling {
  if (
    charge.billing === "per_day" ||
    charge.billing === "per_night" ||
    charge.billing === "per_stay" ||
    charge.billing === "per_person" ||
    charge.billing === "per_person_per_night"
  ) {
    return charge.billing;
  }
  return charge.perNight ? "per_night" : "per_stay";
}
