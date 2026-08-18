"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { mirrorGuestBookingToHost } from "@/lib/booking/mirror-to-host";
import { resolveCatalogListingHost } from "@/lib/listings/catalog-listing-hosts";

async function waitForPaidBooking(bookingId: string, maxAttempts = 12) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`/api/bookings/${bookingId}`);
    const data = (await res.json()) as {
      booking?: {
        id: string;
        listingId: string;
        checkIn: string;
        checkOut: string | null;
        guestCount: number;
        totalPrice: number;
        status: string;
        paymentStatus: string;
        guest?: { fullName?: string; email?: string; phone?: string };
        listing?: { title?: string; hostId?: string };
      };
    };
    if (res.ok && data.booking?.paymentStatus === "paid") {
      return data.booking;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

export function BookingSuccessContent({
  listingId,
  bookingId,
}: {
  listingId: string;
  bookingId?: string;
}) {
  const { user } = useAuth();
  const { listings } = usePublicListings();
  const [ready, setReady] = useState(!bookingId);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    (async () => {
      try {
        const booking =
          (await waitForPaidBooking(bookingId)) ??
          (await fetch(`/api/bookings/${bookingId}`)
            .then((r) => r.json())
            .then((d) => d.booking)
            .catch(() => null));

        if (!booking || cancelled) return;

        const stay = listings.find((s) => s.id === booking.listingId);
        const catalogHost = resolveCatalogListingHost(booking.listingId);
        const checkIn = booking.checkIn.slice(0, 10);
        const checkOut = (booking.checkOut || booking.checkIn).toString().slice(0, 10);

        mirrorGuestBookingToHost({
          id: booking.id,
          listingId: booking.listingId,
          property: stay?.name || booking.listing?.title || "Stay",
          propertyLocation: stay?.location || "",
          guest: booking.guest?.fullName || user?.fullName || "Guest",
          guestEmail: booking.guest?.email || user?.email || "",
          guestPhone: booking.guest?.phone || user?.phone,
          guestId: booking.guestId || user?.id,
          checkIn,
          checkOut,
          guests: booking.guestCount,
          total: booking.totalPrice,
          currency: "AED",
          nightlyRate: stay?.price ?? booking.totalPrice,
          status: booking.status === "confirmed" ? "confirmed" : "pending",
          paymentStatus: booking.paymentStatus === "paid" ? "Paid" : booking.paymentStatus,
          hostId: catalogHost?.hostId || booking.listing?.hostId,
          img: stay?.img,
        });
      } catch {
        // non-fatal — confirmation UI still shows
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, listings, user]);

  if (!ready) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
      <h1 className="text-2xl font-bold text-gray-900">Booking confirmed</h1>
      <p className="text-gray-600">
        Your payment was received. The host will see this stay on their calendar.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          href="/account/trips"
          className="inline-flex items-center justify-center rounded-xl bg-green-700 text-white font-semibold px-6 py-3 hover:bg-green-800"
        >
          View my trips
        </Link>
        <Link
          href={`/listing/${listingId}`}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 font-semibold px-6 py-3 hover:bg-gray-50"
        >
          Back to listing
        </Link>
      </div>
    </div>
  );
}
