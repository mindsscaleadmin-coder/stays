import { prisma } from "@/lib/prisma";
import { getFinancialSettingsFromDb } from "@/lib/server/platform-catalog-repo";
import { clampCommissionPct } from "@/lib/admin/platform-config-data";
import { isDirectoryListing } from "@/lib/booking/is-directory-listing";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { defaultForListing } from "@/lib/host/host-pricing-data";
import {
  buildFinancialSnapshot,
  mergeStripeIntoFinancialSnapshot,
  serializeFinancialSnapshot,
  parseFinancialSnapshot,
} from "@/lib/booking/financial-snapshot";
import {
  estimateGuestQuoteSnapshot,
  parseGuestQuoteSnapshot,
} from "@/lib/booking/guest-quote-snapshot";
import { currencyForCountryName, normalizeCurrency } from "@/lib/currency";
import { LAUNCH_CURRENCY, LAUNCH_TAX_LABEL, LAUNCH_TAX_PCT } from "@/lib/tax/launch-market";
import {
  captureStripeBalanceForSession,
  splitStripeCaptureForBooking,
} from "@/lib/stripe/capture-balance-transaction";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";

function parseListingMeta(payload: string): { currency: string; country: string; parentCategory: string; type: string; category: string } {
  try {
    const p = JSON.parse(payload) as {
      currency?: string;
      country?: string;
      parentCategory?: string;
      type?: string;
      category?: string;
    };
    return {
      currency: p.currency || LAUNCH_CURRENCY,
      country: p.country?.trim() || "",
      parentCategory: p.parentCategory?.trim() || "",
      type: p.type?.trim() || "",
      category: p.category?.trim() || "",
    };
  } catch {
    return { currency: LAUNCH_CURRENCY, country: "", parentCategory: "", type: "", category: "" };
  }
}

async function commissionPctForBooking(
  hostId: string,
  listingMeta: { parentCategory: string; type: string; category: string }
): Promise<number> {
  if (isDirectoryListing(listingMeta)) return 0;
  const settings = await getFinancialSettingsFromDb();
  const override = settings.commission.hostOverrides.find((o) => o.hostId === hostId);
  return clampCommissionPct(override?.feePct ?? settings.commission.globalFeePct);
}

export async function captureBookingFinancials(
  bookingId: string,
  options?: { stripeSessionId?: string | null; sessionBookingTotals?: Map<string, number> }
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { hostId: true, payload: true, country: true } },
    },
  });
  if (!booking) return;

  const meta = parseListingMeta(booking.listing.payload);
  const pricing = (await getListingPricing(booking.listingId)) ?? defaultForListing(booking.listingId);
  const currency = normalizeCurrency(
    pricing.currency || meta.currency || currencyForCountryName(booking.listing.country || meta.country)
  );

  const guestQuote =
    parseGuestQuoteSnapshot(booking.guestQuoteSnapshot) ??
    estimateGuestQuoteSnapshot({
      totalPrice: booking.totalPrice,
      currency,
      taxPct: pricing.taxPct ?? LAUNCH_TAX_PCT,
      taxLabel: pricing.taxLabel ?? LAUNCH_TAX_LABEL,
    });

  const pct = await commissionPctForBooking(booking.listing.hostId, meta);
  let snapshot = buildFinancialSnapshot({
    currency,
    grossAmount: booking.totalPrice,
    guestQuote,
    platformFeePct: pct,
  });

  let paymentIntentId: string | null = booking.stripePaymentIntentId ?? null;
  const sessionId = options?.stripeSessionId ?? booking.stripeSessionId;

  if (sessionId && isStripeConfigured()) {
    const stripe = getStripe();
    if (stripe) {
      const capture = await captureStripeBalanceForSession(stripe, sessionId, currency);
      if (capture) {
        paymentIntentId = capture.paymentIntentId;
        const sessionTotal =
          options?.sessionBookingTotals?.size
            ? Array.from(options.sessionBookingTotals.values()).reduce((s, n) => s + n, 0)
            : booking.totalPrice;
        const split = splitStripeCaptureForBooking(capture, booking.totalPrice, sessionTotal);
        snapshot = mergeStripeIntoFinancialSnapshot(snapshot, {
          processingFee: split.processingFee,
          netReceived: split.netReceived,
        });
      }
    }
  }

  const existing = parseFinancialSnapshot(booking.financialSnapshot);
  if (existing?.stripeProcessingFee != null && snapshot.stripeProcessingFee == null) {
    snapshot = mergeStripeIntoFinancialSnapshot(snapshot, {
      processingFee: existing.stripeProcessingFee,
      netReceived: existing.stripeNetReceived,
    });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      financialSnapshot: serializeFinancialSnapshot(snapshot),
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
  });
}
