import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_")) return null;
  // Let the installed SDK pick its bundled API version.
  return new Stripe(key);
}

/** Stripe expects the smallest currency unit (fils for AED, cents for USD). */
export function toStripeAmount(amount: number, currency: string): number {
  const zeroDecimal = ["jpy", "krw"].includes(currency.toLowerCase());
  if (zeroDecimal) return Math.round(amount);
  return Math.round(amount * 100);
}
