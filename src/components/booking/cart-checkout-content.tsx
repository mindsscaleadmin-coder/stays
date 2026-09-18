"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { Calendar, Lock, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  loadBookingCart,
  type BookingCartLine,
} from "@/lib/guest/booking-cart";
import { quoteCartTotal } from "@/lib/guest/cart-quote";
import { useCartPricing } from "@/lib/guest/use-cart-pricing";
import { formatMoney } from "@/lib/currency";
import { isDataImageUrl } from "@/lib/utils";
import { CheckoutCancellationNotice } from "@/components/booking/checkout-cancellation-notice";
import { getCheckoutCancellationPolicyCopy } from "@/lib/booking/policies";
import { getSubmissionById } from "@/lib/listings/submission-data";

export function CartCheckoutContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [lines, setLines] = useState<BookingCartLine[]>([]);

  useEffect(() => {
    setLines(loadBookingCart());
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent("/cart/checkout")}`);
    }
  }, [loading, user, router]);

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
          Step 1 of 3 · Review
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-1">
          Checkout cart
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Review your stays, then continue to payment
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {lines.map((line) => {
              const q = quoteById.get(line.id);
              return (
                <div
                  key={line.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 flex gap-4"
                >
                  <div className="relative w-28 h-24 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    {line.img ? (
                      <Image
                        src={line.img}
                        alt={line.title}
                        fill
                        className="object-cover"
                        sizes="112px"
                        unoptimized={isDataImageUrl(line.img)}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{line.title}</p>
                    <p className="text-sm text-gray-500 truncate">{line.location}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {line.checkIn} → {line.checkOut}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {line.guests} guest{line.guests === 1 ? "" : "s"}
                      </span>
                    </div>
                    {q && (
                      <p className="mt-2 text-sm font-bold tabular-nums">
                        {formatMoney(q.total, { currency: q.currency })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Order summary</h2>
              <div className="flex justify-between items-baseline border-b border-gray-100 pb-3 mb-4">
                <span className="font-semibold text-gray-900">
                  {lines.length} stay{lines.length === 1 ? "" : "s"}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {formatMoney(total, { currency })}
                </span>
              </div>

              {cancellationPolicies.length > 0 && (
                <div className="mb-4">
                  <CheckoutCancellationNotice policies={cancellationPolicies} />
                </div>
              )}

              <button
                type="button"
                disabled={quotes.length !== lines.length}
                onClick={() => router.push("/cart/payment")}
                className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm"
              >
                <Lock className="w-4 h-4" /> Continue to payment
              </button>
              <p className="mt-3 text-[11px] text-gray-400 text-center leading-relaxed">
                Next: enter card details, then see your thank-you confirmation.
              </p>
              <Link
                href="/cart"
                className="block text-center text-sm text-gray-500 mt-3 hover:text-gray-800"
              >
                Back to cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
