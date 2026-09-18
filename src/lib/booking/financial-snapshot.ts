import { normalizeCurrency } from "@/lib/currency";
import { LAUNCH_CURRENCY, LAUNCH_TAX_LABEL } from "@/lib/tax/launch-market";
import type { GuestQuoteSnapshot } from "@/lib/booking/guest-quote-snapshot";

/** Internal ledger fields — never shown to guests. */
export type FinancialSnapshot = {
  currency: string;
  grossAmount: number;
  taxAmount: number;
  taxLabel: string;
  taxPct: number;
  platformFeePct: number;
  platformFee: number;
  hostNetEarnings: number;
  stripeProcessingFee?: number;
  stripeNetReceived?: number;
  capturedAt: string;
};

export function buildFinancialSnapshot(input: {
  currency: string;
  grossAmount: number;
  guestQuote: GuestQuoteSnapshot;
  platformFeePct: number;
  stripeProcessingFee?: number;
  stripeNetReceived?: number;
}): FinancialSnapshot {
  const gross = Math.max(0, Math.round(input.grossAmount * 100) / 100);
  const pct = Math.max(0, input.platformFeePct);
  const platformFee = Math.round((gross * pct) / 100 * 100) / 100;
  const hostNetEarnings = Math.round((gross - platformFee) * 100) / 100;

  return {
    currency: normalizeCurrency(input.currency || LAUNCH_CURRENCY),
    grossAmount: gross,
    taxAmount: input.guestQuote.taxAmount,
    taxLabel: input.guestQuote.taxLabel,
    taxPct: input.guestQuote.taxPct,
    platformFeePct: pct,
    platformFee,
    hostNetEarnings,
    stripeProcessingFee: input.stripeProcessingFee,
    stripeNetReceived: input.stripeNetReceived,
    capturedAt: new Date().toISOString(),
  };
}

export function serializeFinancialSnapshot(snapshot: FinancialSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseFinancialSnapshot(raw: string | null | undefined): FinancialSnapshot | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as FinancialSnapshot;
    if (typeof parsed.grossAmount !== "number" || typeof parsed.platformFee !== "number") {
      return null;
    }
    return {
      currency: normalizeCurrency(parsed.currency || LAUNCH_CURRENCY),
      grossAmount: parsed.grossAmount,
      taxAmount: parsed.taxAmount ?? 0,
      taxLabel: (parsed.taxLabel || LAUNCH_TAX_LABEL).trim() || LAUNCH_TAX_LABEL,
      taxPct: Math.max(0, parsed.taxPct ?? 0),
      platformFeePct: parsed.platformFeePct ?? 0,
      platformFee: parsed.platformFee,
      hostNetEarnings: parsed.hostNetEarnings ?? 0,
      stripeProcessingFee: parsed.stripeProcessingFee,
      stripeNetReceived: parsed.stripeNetReceived,
      capturedAt: parsed.capturedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function mergeStripeIntoFinancialSnapshot(
  snapshot: FinancialSnapshot,
  stripe: { processingFee?: number; netReceived?: number }
): FinancialSnapshot {
  return {
    ...snapshot,
    stripeProcessingFee: stripe.processingFee ?? snapshot.stripeProcessingFee,
    stripeNetReceived: stripe.netReceived ?? snapshot.stripeNetReceived,
  };
}
