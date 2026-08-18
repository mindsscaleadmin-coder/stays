import { countNights } from "@/lib/host/calculate-stay-price";

export type BookingQuoteInput = {
  checkIn: string;
  checkOut: string;
  guestCount: number;
  /** Accommodation subtotal after stay discounts */
  accommodation: number;
  experiencesTotal?: number;
  extrasTotal?: number;
  taxAmount?: number;
  currency?: string;
};

export type BookingQuote = {
  nights: number;
  currency: string;
  accommodation: number;
  experiencesTotal: number;
  extrasTotal: number;
  taxAmount: number;
  total: number;
  lines: { label: string; amount: number }[];
};

/**
 * Server-side stay total. Does not trust a client-provided grand total —
 * only discrete line inputs which are clamped.
 */
export function computeBookingQuote(input: BookingQuoteInput): BookingQuote {
  const nights = countNights(input.checkIn, input.checkOut);
  if (nights < 1) {
    throw new Error("Check-out must be after check-in");
  }
  if (input.guestCount < 1 || input.guestCount > 50) {
    throw new Error("Invalid guest count");
  }

  const accommodation = Math.max(0, Math.min(Number(input.accommodation) || 0, 500_000));
  const experiencesTotal = Math.max(
    0,
    Math.min(Number(input.experiencesTotal) || 0, 50_000)
  );
  const extrasTotal = Math.max(0, Math.min(Number(input.extrasTotal) || 0, 50_000));
  const taxAmount = Math.max(0, Math.min(Number(input.taxAmount) || 0, 100_000));
  const total = accommodation + experiencesTotal + extrasTotal + taxAmount;
  const currency = (input.currency || "AED").toUpperCase();

  const lines: { label: string; amount: number }[] = [
    {
      label: `Accommodation · ${nights} night${nights === 1 ? "" : "s"}`,
      amount: accommodation,
    },
  ];
  if (experiencesTotal > 0) {
    lines.push({ label: "Experiences", amount: experiencesTotal });
  }
  if (extrasTotal > 0) {
    lines.push({ label: "Extras", amount: extrasTotal });
  }
  if (taxAmount > 0) {
    lines.push({ label: "Tax / fees", amount: taxAmount });
  }

  return {
    nights,
    currency,
    accommodation,
    experiencesTotal,
    extrasTotal,
    taxAmount,
    total,
    lines,
  };
}
