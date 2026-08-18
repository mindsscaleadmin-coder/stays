import type { Stay } from "@/lib/mock/data";
import { loadPricingSettings } from "./host-pricing-data";
import type { ListingPricingSettings } from "./host-pricing-types";

export interface ActiveFlashDeal {
  listingId: string;
  discountPct: number;
  endsAt: string;
  /** Nightly price after flash discount (from base price) */
  dealPrice: number;
  currency: string;
}

/** Whether the listing's flash deal is currently live. */
export function isFlashDealActive(
  settings: Pick<
    ListingPricingSettings,
    "flashDealEnabled" | "flashDealDiscountPct" | "flashDealEndsAt" | "discountsEnabled"
  >,
  now = new Date()
): boolean {
  if (!settings.discountsEnabled || !settings.flashDealEnabled) return false;
  if (!settings.flashDealEndsAt || settings.flashDealDiscountPct <= 0) return false;
  const ends = new Date(settings.flashDealEndsAt);
  if (Number.isNaN(ends.getTime())) return false;
  return ends.getTime() > now.getTime();
}

export function getActiveFlashDeal(
  settings: ListingPricingSettings,
  now = new Date()
): ActiveFlashDeal | null {
  if (!isFlashDealActive(settings, now)) return null;
  const pct = Math.min(100, Math.max(0, settings.flashDealDiscountPct));
  const dealPrice = Math.round(settings.basePrice * (1 - pct / 100));
  return {
    listingId: settings.listingId,
    discountPct: pct,
    endsAt: settings.flashDealEndsAt!,
    dealPrice,
    currency: settings.currency,
  };
}

export function remainingCountdown(endsAt: string, now = new Date()): {
  d: number;
  h: number;
  m: number;
} {
  const ends = new Date(endsAt).getTime();
  const ms = Math.max(0, ends - now.getTime());
  const totalMin = Math.floor(ms / 60_000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  return { d, h, m };
}

/** Default end = 48 hours from now (local), for datetime-local inputs. */
export function defaultFlashDealEndsAt(hoursFromNow = 48): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow, 0, 0, 0);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

/** Convert datetime-local value to ISO for storage. */
export function flashDealEndsAtToIso(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Convert stored ISO to datetime-local input value. */
export function flashDealEndsAtToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

export interface FlashDealCard extends Stay {
  flashDiscountPct: number;
  flashEndsAt: string;
  flashDealPrice: number;
  flashCurrency: string;
}

/**
 * Build homepage flash-deal cards from public listings that have an active host flash deal.
 */
export function buildFlashDealCards(listings: Stay[], now = new Date()): FlashDealCard[] {
  if (typeof window === "undefined") return [];
  const cards: FlashDealCard[] = [];
  for (const stay of listings) {
    const settings = loadPricingSettings(stay.id);
    const deal = getActiveFlashDeal(settings, now);
    if (!deal) continue;
    cards.push({
      ...stay,
      flashDiscountPct: deal.discountPct,
      flashEndsAt: deal.endsAt,
      flashDealPrice: deal.dealPrice,
      flashCurrency: deal.currency,
      price: deal.dealPrice,
      badge: "Deal",
    });
  }
  return cards;
}
