"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { Calendar, ShoppingBag, Trash2, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  BOOKING_CART_SYNC_EVENT,
  loadBookingCart,
  removeFromBookingCart,
  type BookingCartLine,
} from "@/lib/guest/booking-cart";
import { quoteCartLine, quoteCartTotal } from "@/lib/guest/cart-quote";
import { formatMoney } from "@/lib/currency";
import { getCheckoutHref, getGuestLoginHref } from "@/lib/guest/checkout-access";

export function CartContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [lines, setLines] = useState<BookingCartLine[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setLines(loadBookingCart());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(BOOKING_CART_SYNC_EVENT, refresh);
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-booking-cart") refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BOOKING_CART_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const { quotes, total, currency } = useMemo(() => quoteCartTotal(lines), [lines]);
  const quoteById = useMemo(() => {
    const map = new Map(quotes.map((q) => [q.lineId, q]));
    return map;
  }, [quotes]);

  function handleCheckout() {
    const href = "/cart/checkout";
    router.push(getCheckoutHref(user, href));
  }

  if (!ready) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500 text-sm">
        Loading cart…
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-sm text-gray-500 mb-6">
          Add stays from a listing, keep searching, then checkout together.
        </p>
        <Link
          href="/listings"
          className="inline-flex bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          Browse stays
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-1">Your cart</h1>
        <p className="text-sm text-gray-500 mb-8">
          {lines.length} stay{lines.length === 1 ? "" : "s"} · continue searching anytime
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {lines.map((line) => {
              const q = quoteById.get(line.id) ?? quoteCartLine(line);
              return (
                <div
                  key={line.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4"
                >
                  <div className="relative w-28 h-24 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    {line.img ? (
                      <Image
                        src={line.img}
                        alt={line.title}
                        fill
                        className="object-cover"
                        sizes="112px"
                        unoptimized={line.img.startsWith("data:")}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/listing/${line.listingId}`}
                          className="font-semibold text-gray-900 hover:text-green-700 line-clamp-1"
                        >
                          {line.title}
                        </Link>
                        <p className="text-xs text-gray-500 truncate">{line.location}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeFromBookingCart(line.id);
                          refresh();
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {line.checkIn} → {line.checkOut}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {line.guests} guest{line.guests === 1 ? "" : "s"}
                        {q ? ` · ${q.nights} night${q.nights === 1 ? "" : "s"}` : ""}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-gray-900 tabular-nums">
                      {q
                        ? formatMoney(q.total, { currency: q.currency })
                        : "Set valid dates"}
                    </p>
                  </div>
                </div>
              );
            })}

            <Link
              href="/listings"
              className="inline-flex text-sm font-semibold text-green-700 hover:underline"
            >
              + Add another stay
            </Link>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Summary</h2>
              <ul className="space-y-2 mb-4 text-sm text-gray-600">
                {lines.map((line) => {
                  const q = quoteById.get(line.id);
                  return (
                    <li key={line.id} className="flex justify-between gap-3">
                      <span className="truncate">{line.title}</span>
                      <span className="tabular-nums shrink-0 font-medium text-gray-800">
                        {q ? formatMoney(q.total, { currency: q.currency }) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex justify-between items-baseline border-t border-gray-100 pt-3 mb-5">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900 tabular-nums">
                  {formatMoney(total, { currency })}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-sm"
              >
                {user ? "Checkout all" : "Sign in to checkout"}
              </button>
              {!user && (
                <p className="text-[11px] text-gray-500 mt-2 text-center">
                  Cart is saved in this browser — you can keep browsing.
                </p>
              )}
              <Link
                href={user ? "/cart/checkout" : getGuestLoginHref("/cart/checkout")}
                className="sr-only"
              >
                Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
