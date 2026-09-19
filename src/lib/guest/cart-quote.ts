import { loadPricingSettings } from "@/lib/host/host-pricing-data";
import {
  calculateStayQuote,
  countNights,
  stayAccommodationNet,
} from "@/lib/host/calculate-stay-price";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import type { BookingCartLine } from "@/lib/guest/booking-cart";
import { BASE_CURRENCY, DISPLAY_DEFAULT_CURRENCY, normalizeCurrency } from "@/lib/currency";

const EXPERIENCE_PRICES: Record<string, number> = {
  "farm-tour": 75,
  "fruit-picking": 50,
  "bbq-evening": 120,
  "camel-riding": 90,
};

export type CartLineQuote = {
  lineId: string;
  nights: number;
  nightlyRate: number;
  accommodation: number;
  experiencesTotal: number;
  extrasTotal: number;
  taxAmount: number;
  total: number;
  currency: string;
};

export function quoteCartLine(
  line: BookingCartLine,
  settings?: ListingPricingSettings
): CartLineQuote | null {
  const nights = countNights(line.checkIn, line.checkOut);
  if (nights < 1) return null;

  const pricing = settings ?? loadPricingSettings(line.listingId);
  const currency = normalizeCurrency(pricing.currency || line.currency || DISPLAY_DEFAULT_CURRENCY);
  const experiencesTotal =
    line.experienceIds.reduce((sum, id) => sum + (EXPERIENCE_PRICES[id] ?? 0), 0) *
    Math.max(1, line.guests);

  const selectedExtras = pricing.extraChargesEnabled
    ? (pricing.extraCharges ?? []).filter((e) => line.extraIds.includes(e.id))
    : [];

  const stayQuote = calculateStayQuote({
    settings: pricing,
    checkIn: line.checkIn,
    checkOut: line.checkOut,
    guests: line.guests,
    roomIds: line.rooms.length > 0 ? line.rooms : undefined,
    selectedExtras,
    experiencesTotal,
  });

  if (!stayQuote) {
    const accommodation = line.pricePerNight * nights;
    return {
      lineId: line.id,
      nights,
      nightlyRate: line.pricePerNight,
      accommodation,
      experiencesTotal,
      extrasTotal: 0,
      taxAmount: 0,
      total: accommodation + experiencesTotal,
      currency,
    };
  }

  return {
    lineId: line.id,
    nights: stayQuote.nights,
    nightlyRate:
      stayQuote.nights > 0
        ? stayQuote.accommodationSubtotal / stayQuote.nights
        : line.pricePerNight,
    accommodation: stayAccommodationNet(stayQuote),
    experiencesTotal,
    extrasTotal: stayQuote.extrasTotal,
    taxAmount: stayQuote.taxAmount,
    total: stayQuote.total,
    currency: stayQuote.currency || currency,
  };
}

export function quoteCartTotal(
  lines: BookingCartLine[],
  pricingByListing?: Record<string, ListingPricingSettings>
): {
  quotes: CartLineQuote[];
  total: number;
  currency: string;
} {
  const quotes = lines
    .map((line) => quoteCartLine(line, pricingByListing?.[line.listingId]))
    .filter((q): q is CartLineQuote => q != null);
  const currency = quotes[0]?.currency || BASE_CURRENCY;
  const total = quotes.reduce((sum, q) => sum + q.total, 0);
  return { quotes, total, currency };
}
