import { extractInclusiveTax } from "@/lib/tax/inclusive-tax";
import type { StayQuote } from "@/lib/host/calculate-stay-price";
import type { BookingQuote } from "@/lib/booking/compute-quote";
import { normalizeCurrency } from "@/lib/currency";
import { LAUNCH_CURRENCY, LAUNCH_TAX_LABEL } from "@/lib/tax/launch-market";

/** Guest-facing quote — property rate + tax only; no commission or fees. */
export type GuestQuoteSnapshot = {
  currency: string;
  /** Inclusive total the guest pays (same as total). */
  propertyRate: number;
  taxAmount: number;
  taxLabel: string;
  taxPct: number;
  total: number;
};

export function buildGuestQuoteSnapshot(input: {
  currency: string;
  inclusiveTotal: number;
  taxAmount: number;
  taxLabel: string;
  taxPct: number;
}): GuestQuoteSnapshot {
  const currency = normalizeCurrency(input.currency || LAUNCH_CURRENCY);
  const total = Math.max(0, Math.round(input.inclusiveTotal * 100) / 100);
  const taxAmount = Math.max(0, Math.round(input.taxAmount * 100) / 100);
  const taxLabel = (input.taxLabel || LAUNCH_TAX_LABEL).trim() || LAUNCH_TAX_LABEL;
  const taxPct = Math.max(0, input.taxPct);
  return {
    currency,
    propertyRate: total,
    taxAmount,
    taxLabel,
    taxPct,
    total,
  };
}

export function buildGuestQuoteSnapshotFromStayQuote(quote: StayQuote): GuestQuoteSnapshot {
  return buildGuestQuoteSnapshot({
    currency: quote.currency,
    inclusiveTotal: quote.total,
    taxAmount: quote.taxAmount,
    taxLabel: quote.taxLabel,
    taxPct: quote.taxPct,
  });
}

export function buildGuestQuoteSnapshotFromBookingQuote(
  quote: BookingQuote,
  taxLabel: string,
  taxPct: number
): GuestQuoteSnapshot {
  return buildGuestQuoteSnapshot({
    currency: quote.currency,
    inclusiveTotal: quote.total,
    taxAmount: quote.taxAmount,
    taxLabel,
    taxPct,
  });
}

export function serializeGuestQuoteSnapshot(snapshot: GuestQuoteSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseGuestQuoteSnapshot(raw: string | null | undefined): GuestQuoteSnapshot | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as GuestQuoteSnapshot;
    if (
      typeof parsed.currency !== "string" ||
      typeof parsed.propertyRate !== "number" ||
      typeof parsed.taxAmount !== "number" ||
      typeof parsed.total !== "number"
    ) {
      return null;
    }
    return {
      currency: normalizeCurrency(parsed.currency),
      propertyRate: parsed.propertyRate,
      taxAmount: parsed.taxAmount,
      taxLabel: (parsed.taxLabel || LAUNCH_TAX_LABEL).trim() || LAUNCH_TAX_LABEL,
      taxPct: Math.max(0, parsed.taxPct ?? 0),
      total: parsed.total,
    };
  } catch {
    return null;
  }
}

/** Fallback when no snapshot exists on legacy bookings. */
export function estimateGuestQuoteSnapshot(input: {
  totalPrice: number;
  currency: string;
  taxPct: number;
  taxLabel: string;
}): GuestQuoteSnapshot {
  const { taxAmount } = extractInclusiveTax(input.totalPrice, input.taxPct);
  return buildGuestQuoteSnapshot({
    currency: input.currency,
    inclusiveTotal: input.totalPrice,
    taxAmount,
    taxLabel: input.taxLabel,
    taxPct: input.taxPct,
  });
}
