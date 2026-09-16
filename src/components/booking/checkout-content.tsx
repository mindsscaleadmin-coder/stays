"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { Calendar, Loader2, Lock, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { loadPricingSettings, savePricingSettings } from "@/lib/host/host-pricing-data";
import { fetchPricingFromApi, shouldUseSharedPricingStore } from "@/lib/host/host-pricing-api";
import type { ListingPricingSettings } from "@/lib/host/host-pricing-types";
import { calculateStayQuote, countNights } from "@/lib/host/calculate-stay-price";
import { BASE_CURRENCY, formatMoney, formatStoredMoney  } from "@/lib/currency";
import { listingHref } from "@/lib/guest/stay-search-dates";
import { resolveCatalogListingHost } from "@/lib/listings/catalog-listing-hosts";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useLocale } from "next-intl";
import { computeExperienceQuote } from "@/lib/booking/compute-experience-quote";
import { normalizeExperienceSessions } from "@/lib/booking/experience-session-types";
import { isExperienceListing } from "@/lib/booking/is-experience-listing";
import { isDirectoryListing } from "@/lib/booking/is-directory-listing";
import { isDataImageUrl } from "@/lib/utils";

const EXPERIENCE_PRICES: Record<string, { title: string; amount: number }> = {
  "farm-tour": { title: "Farm Tour", amount: 75 },
  "fruit-picking": { title: "Fruit Picking", amount: 50 },
  "bbq-evening": { title: "BBQ Evening", amount: 120 },
  "camel-riding": { title: "Camel Riding", amount: 90 },
};

type Props = {
  listingId: string;
  kind?: "stay" | "experience";
  checkIn: string;
  checkOut: string;
  date?: string;
  sessionKey?: string;
  guests: number;
  rooms: string[];
  experienceIds: string[];
  extraIds: string[];
};

export function CheckoutContent({
  listingId,
  kind = "stay",
  checkIn,
  checkOut,
  date = "",
  sessionKey = "",
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
  const [paymentMode, setPaymentMode] = useState<"stripe" | "demo">("demo");

  const stay = useMemo(
    () => listings.find((s) => s.id === listingId),
    [listings, listingId]
  );

  const asDirectory = isDirectoryListing({
    parentCategory: stay?.parentCategory,
    type: stay?.type,
    category: stay?.category,
  });

  const asExperience =
    kind === "experience" ||
    isExperienceListing({
      parentCategory: stay?.parentCategory,
      type: stay?.type,
    });

  const experienceDate = date || checkIn;

  const countryPricing = useMemo(
    () => resolveCountryPricingConfig(taxonomy.countries, stay?.location),
    [taxonomy.countries, stay?.location]
  );

  const nights = checkIn && checkOut ? countNights(checkIn, checkOut) : 0;
  const [pricing, setPricing] = useState<ListingPricingSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fromApi = shouldUseSharedPricingStore()
        ? await fetchPricingFromApi(listingId).catch(() => null)
        : null;
      if (cancelled) return;
      if (fromApi) savePricingSettings(fromApi);
      setPricing(fromApi ?? loadPricingSettings(listingId, countryPricing));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [listingId, countryPricing]);

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

  const quotePreview = useMemo(() => {
    if (!stay || !pricing || !checkIn || !checkOut || nights < 1) return null;
    const currency =
      pricing.currency || countryPricing.currency || BASE_CURRENCY;
    const experiencesTotal =
      experienceIds.reduce((sum, id) => sum + (EXPERIENCE_PRICES[id]?.amount ?? 0), 0) *
      Math.max(1, guests);

    const selectedExtras = pricing.extraChargesEnabled
      ? (pricing.extraCharges ?? []).filter((e) => extraIds.includes(e.id))
      : [];

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
    pricing,
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

  const experienceQuote = useMemo(() => {
    if (!asExperience || !pricing || !sessionKey) return null;
    const sessions = normalizeExperienceSessions(pricing.sessions);
    const session = sessions.find((s) => s.key === sessionKey);
    if (!session) return null;
    const currency =
      pricing.currency || countryPricing.currency || BASE_CURRENCY;
    const quote = computeExperienceQuote({
      session,
      guestCount: guests,
      taxPct: pricing.taxPct,
      taxLabel: pricing.taxLabel,
      currency,
    });
    return { quote, session, currency };
  }, [asExperience, pricing, sessionKey, guests, countryPricing.currency]);

  async function handlePay() {
    if (!stay || !user) return;

    if (asExperience) {
      if (!experienceDate || !sessionKey || !experienceQuote) {
        setError("Select a date and session before checkout.");
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
            kind: "experience",
            listingId: stay.id,
            date: experienceDate,
            sessionKey,
            guestCount: guests,
            currency: experienceQuote.currency,
            guestId: user.id,
            guestName: user.fullName,
            guestEmail: user.email,
            demoPay: true,
            listing: {
              id: stay.id,
              title: stay.name,
              hostId: catalogHost?.hostId ?? stay.hostId,
              hostName: catalogHost?.hostName,
              location: stay.location,
              maxGuests: stay.guests,
              pricePerNight: experienceQuote.session.price,
              instantBook: stay.instantBook,
              currency: experienceQuote.currency,
              parentCategory: stay.parentCategory,
              type: stay.type,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not create booking");
        if (data.mode === "stripe" && data.checkoutUrl) {
          window.location.href = data.checkoutUrl as string;
          return;
        }
        const booking = data.booking as { id: string };
        if (data.mode === "demo" && !data.paid && booking.id) {
          const payRes = await fetch(`/api/bookings/${booking.id}/demo-pay`, {
            method: "POST",
          });
          const payData = await payRes.json();
          if (!payRes.ok) throw new Error(payData.error || "Payment failed");
        }
        router.push(`/booking/${stay.id}/success?bookingId=${booking.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPaying(false);
      }
      return;
    }

    if (!quotePreview?.stayQuote) return;
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
            hostId: catalogHost?.hostId ?? stay.hostId,
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

      const booking = data.booking as { id: string };

      if (data.mode === "demo" && !data.paid && booking.id) {
        const payRes = await fetch(`/api/bookings/${booking.id}/demo-pay`, {
          method: "POST",
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.error || "Payment failed");
      }

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

  if (asDirectory) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-bold text-gray-900">Enquire with the host</h1>
        <p className="text-sm text-gray-600">
          Directory listings are not booked or paid on this platform. Open the listing to
          contact the host directly.
        </p>
        <Link href={`/listing/${listingId}`} className="text-green-700 font-semibold text-sm">
          Back to listing
        </Link>
      </div>
    );
  }

  if (asExperience) {
    if (!experienceDate || !sessionKey || !experienceQuote) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-800 font-medium">Choose a date and session before checkout</p>
          <Link
            href={`/listing/${listingId}`}
            className="text-sm text-green-700 font-semibold mt-3 inline-block"
          >
            Back to listing
          </Link>
        </div>
      );
    }

    const currency = experienceQuote.currency;
    const money = (amount: number) =>
      formatStoredMoney(amount, {
        storedCurrency: currency,
        currency,
        exchangeRateToAED: countryPricing.exchangeRateToAED,
        locale,
      });

    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-6">Checkout</h1>
        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              <Image src={stay.img} alt={stay.name} fill className="object-cover" unoptimized />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{stay.name}</p>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {experienceDate} · {experienceQuote.session.label}
              </p>
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {guests} guest{guests === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
            {experienceQuote.quote.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-2 text-gray-600">
                <span>{line.label}</span>
                <span>{money(line.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-2 font-semibold text-gray-900 pt-2">
              <span>Total</span>
              <span>{money(experienceQuote.quote.total)}</span>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={paying || !user}
            onClick={() => void handlePay()}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm inline-flex items-center justify-center gap-2"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {paying
              ? "Processing…"
              : paymentMode === "stripe"
                ? "Pay with Stripe"
                : "Confirm & pay (demo)"}
          </button>
          {!user && (
            <p className="text-xs text-center text-gray-500">Sign in to complete booking.</p>
          )}
        </div>
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
  const money = (amount: number) =>
    formatStoredMoney(amount, {
      storedCurrency: currency,
      storedRateToAED: countryPricing.exchangeRateToAED,
      currency: countryPricing.currency,
      exchangeRateToAED: countryPricing.exchangeRateToAED,
      locale,
    });

  return (
    <div className="bg-gray-50 min-h-[70vh] pb-24 lg:pb-0">
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
                    unoptimized={isDataImageUrl(stay.img)}
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
                <div className="mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <p className="text-sm text-red-600">{error}</p>
                  {/not available|overlap/i.test(error) && (
                    <Link
                      href={listingHref(listingId, { checkIn, checkOut, guests })}
                      className="mt-2.5 inline-flex w-full items-center justify-center text-sm font-semibold bg-white border border-red-200 text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg"
                    >
                      Choose other dates
                    </Link>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={paying || !quotePreview?.stayQuote}
                onClick={handlePay}
                className="hidden lg:inline-flex w-full items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl transition-colors"
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
              <p className="mt-3 text-[11px] text-gray-400 text-center leading-relaxed hidden lg:block">
                {paymentMode === "stripe"
                  ? "You will be redirected to Stripe Checkout."
                  : "Demo mode: payment is simulated and the booking is written to the host calendar."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500">Total</p>
          <p className="text-base font-bold text-gray-900 tabular-nums leading-tight">
            {money(quotePreview?.total ?? 0)}
          </p>
        </div>
        <button
          type="button"
          disabled={paying || !quotePreview?.stayQuote}
          onClick={handlePay}
          className="ms-auto shrink-0 inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-xl min-h-[44px]"
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
      </div>
    </div>
  );
}
