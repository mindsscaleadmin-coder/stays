"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  clearBookingCart,
  loadBookingCart,
  type BookingCartLine,
} from "@/lib/guest/booking-cart";
import { quoteCartLine, quoteCartTotal } from "@/lib/guest/cart-quote";
import { useCartPricing } from "@/lib/guest/use-cart-pricing";
import { formatMoney } from "@/lib/currency";
import { resolveCatalogListingHost } from "@/lib/listings/catalog-listing-hosts";
import { CheckoutCancellationNotice } from "@/components/booking/checkout-cancellation-notice";
import { getCheckoutCancellationPolicyCopy } from "@/lib/booking/policies";
import { getSubmissionById } from "@/lib/listings/submission-data";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  const digits = onlyDigits(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function validateCard(input: {
  name: string;
  number: string;
  expiry: string;
  cvc: string;
}): string | null {
  if (!input.name.trim()) return "Enter the name on the card.";
  const number = onlyDigits(input.number);
  if (number.length < 13 || number.length > 19) {
    return "Enter a valid card number.";
  }
  const expiry = onlyDigits(input.expiry);
  if (expiry.length !== 4) return "Enter expiry as MM/YY.";
  const month = Number(expiry.slice(0, 2));
  const year = Number(expiry.slice(2));
  if (month < 1 || month > 12) return "Enter a valid expiry month.";
  const now = new Date();
  const expEnd = new Date(2000 + year, month, 0, 23, 59, 59);
  if (expEnd < now) return "This card looks expired.";
  const cvc = onlyDigits(input.cvc);
  if (cvc.length < 3 || cvc.length > 4) return "Enter a valid CVC.";
  return null;
}

export function CartPaymentContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [lines, setLines] = useState<BookingCartLine[]>([]);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<"stripe" | "demo">("demo");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  useEffect(() => {
    setLines(loadBookingCart());
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent("/cart/payment")}`);
    }
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments/mode")
      .then((res) => res.json())
      .then((data: { mode?: string }) => {
        if (!cancelled && data.mode === "stripe") setPaymentMode("stripe");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const pricingByListing = useCartPricing(lines);
  const { quotes, total, currency } = useMemo(
    () => quoteCartTotal(lines, pricingByListing),
    [lines, pricingByListing]
  );
  const quoteById = useMemo(
    () => new Map(quotes.map((q) => [q.lineId, q])),
    [quotes]
  );
  const cancellationPolicies = useMemo(
    () =>
      lines.map((line) => {
        const quote = quoteById.get(line.id);
        const copy = getCheckoutCancellationPolicyCopy({
          policyId: getSubmissionById(line.listingId)?.cancellationPolicyId,
          checkIn: line.checkIn,
          totalPrice: quote?.total ?? 0,
        });
        return {
          listingTitle: line.title,
          label: copy.label,
          description: copy.description,
          refundPreview: copy.refundPreview,
        };
      }),
    [lines, quoteById]
  );

  async function handlePay() {
    if (!user || lines.length === 0) return;
    setError(null);

    if (paymentMode === "demo") {
      const cardError = validateCard({
        name: cardName,
        number: cardNumber,
        expiry: cardExpiry,
        cvc: cardCvc,
      });
      if (cardError) {
        setError(cardError);
        return;
      }
    }

    setPaying(true);

    try {
      const payloadLines = lines.map((line) => {
        const quote = quoteCartLine(line, pricingByListing[line.listingId]);
        if (!quote) throw new Error(`Invalid dates for ${line.title}`);
        const catalogHost = resolveCatalogListingHost(line.listingId);
        return {
          listingId: line.listingId,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
          guestCount: line.guests,
          currency: quote.currency,
          roomIds: line.rooms,
          experienceIds: line.experienceIds,
          extraIds: line.extraIds,
          listing: {
            id: line.listingId,
            title: line.title,
            hostId: catalogHost?.hostId,
            hostName: catalogHost?.hostName,
            location: line.location,
            maxGuests: line.maxGuests,
            pricePerNight: line.pricePerNight,
            instantBook: line.instantBook,
            currency: quote.currency,
          },
        };
      });

      const res = await fetch("/api/bookings/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: payloadLines,
          guestId: user.id,
          guestName: user.fullName,
          guestEmail: user.email,
          demoPay: true,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        mode?: string;
        checkoutUrl?: string;
        paid?: boolean;
        bookingIds?: string[];
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not book cart");
      }

      if (data.mode === "stripe" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      const bookingIds = data.bookingIds ?? [];
      if (data.mode === "demo" && !data.paid) {
        for (const id of bookingIds) {
          const payRes = await fetch(`/api/bookings/${id}/demo-pay`, { method: "POST" });
          const payData = await payRes.json();
          if (!payRes.ok) throw new Error(payData.error || "Payment failed");
        }
      }

      clearBookingCart();
      const qs = new URLSearchParams({
        bookingIds: bookingIds.join(","),
        count: String(bookingIds.length),
      });
      router.push(`/cart/success?${qs.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPaying(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500 text-sm">
        Checking sign-in…
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-800 font-medium">Cart is empty</p>
        <Link href="/cart" className="text-sm text-green-700 font-semibold mt-3 inline-block">
          Back to cart
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Step 2 of 3 · Payment
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-1">
          Card details
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Pay securely for {lines.length} stay{lines.length === 1 ? "" : "s"} ·{" "}
          {formatMoney(total, { currency })}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CreditCard className="w-4 h-4 text-green-700" />
                Payment card
              </div>

              {paymentMode === "stripe" ? (
                <p className="text-sm text-gray-600 leading-relaxed">
                  You will enter card details on Stripe’s secure checkout page on the next
                  step.
                </p>
              ) : (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Name on card
                    </span>
                    <input
                      type="text"
                      autoComplete="cc-name"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Full name"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Card number
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 tabular-nums placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Expiry
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 tabular-nums placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        CVC
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(onlyDigits(e.target.value).slice(0, 4))}
                        placeholder="123"
                        className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 tabular-nums placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                      />
                    </label>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Demo mode — use any valid-looking card. No real charge is made.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Order total</h2>
              <div className="flex justify-between items-baseline border-b border-gray-100 pb-3 mb-4">
                <span className="font-semibold text-gray-900">
                  {lines.length} stay{lines.length === 1 ? "" : "s"}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {formatMoney(total, { currency })}
                </span>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                  {error}
                </p>
              )}

              {cancellationPolicies.length > 0 && (
                <div className="mb-4">
                  <CheckoutCancellationNotice policies={cancellationPolicies} />
                </div>
              )}

              <button
                type="button"
                disabled={paying || quotes.length !== lines.length}
                onClick={() => void handlePay()}
                className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {paymentMode === "stripe" ? "Continue to Stripe" : "Pay now"}
                  </>
                )}
              </button>
              <Link
                href="/cart/checkout"
                className="block text-center text-sm text-gray-500 mt-3 hover:text-gray-800"
              >
                Back to checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
