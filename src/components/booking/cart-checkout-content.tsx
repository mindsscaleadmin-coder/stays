"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { Calendar, Loader2, Lock, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  clearBookingCart,
  loadBookingCart,
  type BookingCartLine,
} from "@/lib/guest/booking-cart";
import { quoteCartLine, quoteCartTotal } from "@/lib/guest/cart-quote";
import { mirrorGuestBookingToHost } from "@/lib/booking/mirror-to-host";
import { formatMoney } from "@/lib/currency";
import { resolveCatalogListingHost } from "@/lib/listings/catalog-listing-hosts";

export function CartCheckoutContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [lines, setLines] = useState<BookingCartLine[]>([]);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    setLines(loadBookingCart());
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent("/cart/checkout")}`);
    }
  }, [loading, user, router]);

  const { quotes, total, currency } = useMemo(() => quoteCartTotal(lines), [lines]);
  const quoteById = useMemo(
    () => new Map(quotes.map((q) => [q.lineId, q])),
    [quotes]
  );

  const payOne = useCallback(
    async (line: BookingCartLine) => {
      if (!user) throw new Error("Sign in required");
      const quote = quoteCartLine(line);
      if (!quote) throw new Error(`Invalid dates for ${line.title}`);

      const catalogHost = resolveCatalogListingHost(line.listingId);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: line.listingId,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
          guestCount: line.guests,
          nightlyRate: quote.nightlyRate,
          accommodation: quote.accommodation,
          experiencesTotal: quote.experiencesTotal,
          extrasTotal: quote.extrasTotal,
          taxAmount: quote.taxAmount,
          currency: quote.currency,
          roomIds: line.rooms,
          experienceIds: line.experienceIds,
          extraIds: line.extraIds,
          guestId: user.id,
          guestName: user.fullName,
          guestEmail: user.email,
          demoPay: true,
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Could not book ${line.title}`);
      }

      if (data.mode === "stripe" && data.checkoutUrl) {
        // Multi-cart + Stripe single session not wired — fall through to demo for remaining
        // or redirect only when cart has one item
        if (lines.length === 1) {
          window.location.href = data.checkoutUrl as string;
          return null;
        }
        throw new Error(
          "Stripe checkout supports one stay at a time for now. Remove other items or use demo pay."
        );
      }

      const booking = data.booking as {
        id: string;
        status: string;
        paymentStatus: string;
        totalPrice: number;
      };

      let paymentStatus = booking.paymentStatus;
      let status = booking.status;
      if (data.mode === "demo" && !data.paid && booking.id) {
        const payRes = await fetch(`/api/bookings/${booking.id}/demo-pay`, {
          method: "POST",
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.error || "Payment failed");
        paymentStatus = payData.booking.paymentStatus;
        status = payData.booking.status;
      }

      mirrorGuestBookingToHost({
        id: booking.id,
        listingId: line.listingId,
        property: line.title,
        propertyLocation: line.location,
        guest: user.fullName,
        guestEmail: user.email,
        guestPhone: user.phone,
        guestId: user.id,
        checkIn: line.checkIn,
        checkOut: line.checkOut,
        guests: line.guests,
        total: booking.totalPrice ?? quote.total,
        currency: quote.currency,
        nightlyRate: quote.nightlyRate,
        status: status === "confirmed" ? "confirmed" : "pending",
        paymentStatus: paymentStatus === "paid" ? "Paid" : paymentStatus,
        hostId: catalogHost?.hostId,
        img: line.img,
      });

      return booking.id;
    },
    [user, lines.length]
  );

  async function handlePayAll() {
    if (!user || lines.length === 0) return;
    setPaying(true);
    setError(null);

    try {
      const bookingIds: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        setProgress(`Booking ${i + 1} of ${lines.length}: ${line.title}`);
        const id = await payOne(line);
        if (id) bookingIds.push(id);
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
      setProgress("");
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
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-1">
          Checkout cart
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Each stay becomes its own booking · one payment step for all
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
                        unoptimized={line.img.startsWith("data:")}
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

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Guest</h2>
              <p className="text-sm text-gray-800">{user.fullName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Pay all</h2>
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
              {progress && (
                <p className="text-xs text-gray-500 mb-3">{progress}</p>
              )}

              <button
                type="button"
                disabled={paying}
                onClick={() => void handlePayAll()}
                className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Paying…
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Confirm &amp; pay all
                  </>
                )}
              </button>
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
