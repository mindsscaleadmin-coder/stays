import type Stripe from "stripe";
import { toStripeAmount } from "@/lib/stripe/server";

export type StripeBalanceCapture = {
  paymentIntentId: string | null;
  processingFee: number;
  netReceived: number;
  grossAmount: number;
  currency: string;
};

function fromStripeAmount(amount: number, currency: string): number {
  const zeroDecimal = ["jpy", "krw"].includes(currency.toLowerCase());
  if (zeroDecimal) return amount;
  return Math.round(amount) / 100;
}

export function parseBalanceTransaction(
  bt: Stripe.BalanceTransaction | string | null | undefined,
  currency: string
): Pick<StripeBalanceCapture, "processingFee" | "netReceived" | "grossAmount"> {
  if (!bt || typeof bt === "string") {
    return { processingFee: 0, netReceived: 0, grossAmount: 0 };
  }
  const cur = (bt.currency || currency).toUpperCase();
  return {
    processingFee: fromStripeAmount(bt.fee, cur),
    netReceived: fromStripeAmount(bt.net, cur),
    grossAmount: fromStripeAmount(bt.amount, cur),
  };
}

export async function captureStripeBalanceForSession(
  stripe: Stripe,
  sessionId: string,
  currency: string
): Promise<StripeBalanceCapture | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge.balance_transaction"],
    });
    const pi = session.payment_intent;
    if (!pi || typeof pi === "string") return null;

    const charge = pi.latest_charge;
    const bt =
      charge && typeof charge !== "string" ? charge.balance_transaction : null;

    const parsed = parseBalanceTransaction(
      bt && typeof bt !== "string" ? bt : null,
      currency
    );

    return {
      paymentIntentId: pi.id,
      ...parsed,
      currency: currency.toUpperCase(),
    };
  } catch {
    return null;
  }
}

/** Split Stripe fees across cart bookings proportionally by totalPrice. */
export function splitStripeCaptureForBooking(
  capture: StripeBalanceCapture,
  bookingTotal: number,
  sessionTotal: number
): { processingFee: number; netReceived: number } {
  if (sessionTotal <= 0) {
    return { processingFee: 0, netReceived: 0 };
  }
  const ratio = bookingTotal / sessionTotal;
  return {
    processingFee: Math.round(capture.processingFee * ratio * 100) / 100,
    netReceived: Math.round(capture.netReceived * ratio * 100) / 100,
  };
}

export { toStripeAmount };
