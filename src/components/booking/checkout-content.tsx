"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { Calendar, Loader2, Lock, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { loadPricingSettings } from "@/lib/host/host-pricing-data";
import { calculateStayQuote } from "@/lib/host/calculate-stay-price";
import { countNights } from "@/lib/host/calculate-stay-price";
import { mirrorGuestBookingToHost } from "@/lib/booking/mirror-to-host";
import { formatMoney } from "@/lib/currency";
import { resolveCatalogListingHost } from "@/lib/listings/catalog-listing-hosts";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useLocale } from "next-intl";

const EXPERIENCE_PRICES: Record<string, { title: string; amount: number }> = {
  "farm-tour": { title: "Farm Tour", amount: 75 },
  "fruit-picking": { title: "Fruit Picking", amount: 50 },
  "bbq-evening": { title: "BBQ Evening", amount: 120 },
  "camel-riding": { title: "Camel Riding", amount: 90 },
};

type Props = {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: string[];
  experienceIds: string[];
  extraIds: string[];
};

export function CheckoutContent({
  listingId,
  checkIn,
  checkOut,
  guests,
  rooms,
  experienceIds,
  extraIds,
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const { listings } = usePublicListings();
  const { data: taxonomy } = useAdminTaxonomy();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stay = useMemo(
    () => listings.find((s) => s.id === listingId),
    [listings, listingId]
  );

  const countryPricing = useMemo(
    () => resolveCountryPricingConfig(taxonomy.countries, stay?.location),
    [taxonomy.countries, stay?.location]
  );

  const nights = checkIn && checkOut ? countNights(checkIn, checkOut) : 0;

  const quotePreview = useMemo(() => {
    if (!stay || !checkIn || !checkOut || nights < 1) return null;

    const pricing = loadPricingSettings(stay.id);
    const currency =
      pricing.currency || countryPricing.currency || "AED";
    const experiencesTotal =
      experienceIds.reduce((sum, id) => sum + (EXPERIENCE_PRICES[id]?.amount ?? 0), 0) *
      Math.max(1, guests);

    const selectedExtras = (pricing.extraCharges ?? []).filter((e) =>
      extraIds.includes(e.id)
    );

    const stayQuote = calculateStayQuote({
      settings: pricing,
      checkIn,
      checkOut,
      guests,
      roomIds: rooms.length > 0 ? rooms : undefined,
      selectedExtras,
      experiencesTotal,
    });

    if (!stayQuote) {
      const accommodation = stay.price * nights;
      const nightlyLabel = formatMoney(stay.price, {
        currency,
        exchangeRateToAED: countryPricing.exchangeRateToAED,
        locale,
      });
      return {
        stayQuote: null as null,
        nightlyRate: stay.price,
        experiencesTotal,
        extrasTotal: 0,
        taxAmount: 0,
        accommodation,
        total: accommodation + experiencesTotal,
        currency,
        exchangeRateToAED: countryPricing.exchangeRateToAED,
        lines: [
          {
            label: `${nightlyLabel} × ${nights} nights`,
            amount: accommodation,
          },
          ...(experiencesTotal > 0
            ? [{ label: "Experiences", amount: experiencesTotal }]
            : []),
        ],
      };
    }

    const nightlyRate =
      stayQuote.nights > 0
        ? stayQuote.accommodationSubtotal / stayQuote.nights
        : stay.price;

    return {
      stayQuote,
      nightlyRate,
      experiencesTotal,
      extrasTotal: stayQuote.extrasTotal,
      taxAmount: stayQuote.taxAmount,
      accommodation: Math.max(
        0,
        stayQuote.accommodationSubtotal - stayQuote.discountAmount
      ),
      total: stayQuote.total,
      currency: stayQuote.currency || currency,
      exchangeRateToAED: countryPricing.exchangeRateToAED,
      lines: stayQuote.lines,
    };
  }, [
    stay,
    checkIn,
    checkOut,
    guests,
    rooms,
    experienceIds,
    extraIds,
    nights,
    countryPricing,
    locale,
  ]);

  async function handlePay() {
    if (!stay || !quotePreview || !user) return;
    if (!checkIn || !checkOut || nights < 1) {
      setError("Select valid check-in and check-out dates.");
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const catalogHost = resolveCatalogListingHost(stay.id);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: stay.id,
          checkIn,
          checkOut,
          guestCount: guests,
          nightlyRate: quotePreview.nightlyRate,
          accommodation: quotePreview.accommodation,
          experiencesTotal: quotePreview.experiencesTotal,
          extrasTotal: quotePreview.extrasTotal,
          taxAmount: quotePreview.taxAmount,
          currency: quotePreview.currency,
          roomIds: rooms,
          experienceIds,
          extraIds,
          guestId: user.id,
          guestName: user.fullName,
          guestEmail: user.email,
          demoPay: true,
          listing: {
            id: stay.id,
            title: stay.name,
            hostId: catalogHost?.hostId,
            hostName: catalogHost?.hostName,
            location: stay.location,
            maxGuests: stay.guests,
            pricePerNight: stay.price,
            instantBook: stay.instantBook,
            currency: quotePreview.currency,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not create booking");
      }

      if (data.mode === "stripe" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl as string;
        return;
      }

      const booking = data.booking as {
        id: string;
        status: string;
        paymentStatus: string;
        totalPrice: number;
      };

      // When demoPay wasn't applied server-side, complete it
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
        listingId: stay.id,
        property: stay.name,
        propertyLocation: stay.location,
        guest: user.fullName,
        guestEmail: user.email,
        guestPhone: user.phone,
        guestId: user.id,
        checkIn,
        checkOut,
        guests,
        total: booking.totalPrice ?? quotePreview.total,
        currency: quotePreview.currency,
        nightlyRate: quotePreview.nightlyRate,
        status: status === "confirmed" ? "confirmed" : "pending",
        paymentStatus: paymentStatus === "paid" ? "Paid" : paymentStatus,
        hostId: catalogHost?.hostId,
        img: stay.img,
      });

      router.push(`/booking/${stay.id}/success?bookingId=${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPaying(false);
    }
  }

  if (!stay) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-800 font-medium">Listing not found</p>
        <Link href="/listings" className="text-sm text-green-700 font-semibold mt-3 inline-block">
          Browse listings
        </Link>
      </div>
    );
  }

  if (!checkIn || !checkOut || nights < 1) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-800 font-medium">Choose dates before checkout</p>
        <Link
          href={`/listing/${listingId}`}
          className="text-sm text-green-700 font-semibold mt-3 inline-block"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  const currency = quotePreview?.currency ?? countryPricing.currency;
  const rate = quotePreview?.exchangeRateToAED ?? countryPricing.exchangeRateToAED;
  const money = (amountAed: number) =>
    formatMoney(amountAed, {
      currency,
      exchangeRateToAED: rate,
      locale,
    });

  return (
    <div className="bg-gray-50 min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-1">Checkout</h1>
        <p className="text-sm text-gray-500 mb-8">
          Review your stay and confirm payment
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex gap-4">
                <div className="relative w-28 h-24 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  <Image
                    src={stay.img}
                    alt={stay.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                    unoptimized={stay.img.startsWith("data:")}
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{stay.name}</p>
                  <p className="text-sm text-gray-500 truncate">{stay.location}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {checkIn} → {checkOut}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {guests} guest{guests === 1 ? "" : "s"} · {nights} night
                      {nights === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Guest</h2>
              <p className="text-sm text-gray-800">{user?.fullName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>

            {experienceIds.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-2">Experiences</h2>
                <ul className="text-sm text-gray-600 space-y-1">
                  {experienceIds.map((id) => (
                    <li key={id}>{EXPERIENCE_PRICES[id]?.title ?? id}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Price details</h2>
              <ul className="space-y-2 mb-4">
                {(quotePreview?.lines ?? []).map((line) => (
                  <li
                    key={line.label}
                    className="flex justify-between gap-3 text-sm text-gray-600"
                  >
                    <span className="truncate">{line.label}</span>
                    <span className="tabular-nums shrink-0 font-medium text-gray-800">
                      {line.amount < 0 ? "−" : ""}
                      {money(Math.abs(line.amount))}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-baseline border-t border-gray-100 pt-3 mb-5">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900 tabular-nums">
                  {money(quotePreview?.total ?? 0)}
                </span>
              </div>

              {error && (
                <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={paying || !quotePreview}
                onClick={handlePay}
                className="w-full inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Confirm and pay
                  </>
                )}
              </button>
              <p className="mt-3 text-[11px] text-gray-400 text-center leading-relaxed">
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  ? "You will be redirected to Stripe Checkout."
                  : "Demo mode: payment is simulated and the booking is written to the host calendar."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
