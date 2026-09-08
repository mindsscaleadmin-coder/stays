"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Check, CheckCircle2, Copy, Loader2 } from "lucide-react";

type PaidBooking = {
  id: string;
  bookingReference: string;
  listingId: string;
  paymentStatus: string;
};

async function confirmStripeReturn(bookingId: string, sessionId?: string) {
  const res = await fetch(`/api/bookings/${bookingId}/confirm-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { booking?: PaidBooking; paid?: boolean };
  if (data.paid && data.booking) return data.booking;
  return null;
}

async function waitForPaidBooking(bookingId: string, maxAttempts = 12) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`/api/bookings/${bookingId}`);
    const data = (await res.json()) as { booking?: PaidBooking };
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
  sessionId,
}: {
  listingId: string;
  bookingId?: string;
  sessionId?: string;
}) {
  const [ready, setReady] = useState(!bookingId);
  const [paid, setPaid] = useState(!bookingId);
  const [bookingReference, setBookingReference] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    (async () => {
      try {
        const booking =
          (sessionId ? await confirmStripeReturn(bookingId, sessionId) : null) ??
          (await waitForPaidBooking(bookingId));

        if (!booking || cancelled) {
          if (!cancelled) {
            setPaid(false);
            setReady(true);
          }
          return;
        }

        setPaid(booking.paymentStatus === "paid");
        setBookingReference(booking.bookingReference);
      } catch {
        // non-fatal — confirmation UI still shows
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, sessionId]);

  if (!ready) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
        <p className="text-sm text-gray-500">Confirming your payment…</p>
      </div>
    );
  }

  if (bookingId && !paid) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <Loader2 className="w-12 h-12 text-amber-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Payment is still processing</h1>
        <p className="text-gray-600">
          Stripe has not marked this booking paid yet. Refresh in a moment, or open My
          trips — the host calendar updates as soon as payment clears.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/account?tab=bookings&booking=${encodeURIComponent(bookingId)}`}
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

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
      <h1 className="text-2xl font-bold text-gray-900">Booking confirmed</h1>
      <p className="text-gray-600">
        Your payment was received. The host will see this stay on their calendar.
      </p>
      {bookingReference && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Booking reference
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(bookingReference);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                // The reference remains selectable when clipboard access is unavailable.
              }
            }}
            className="mx-auto mt-1 inline-flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-xl font-bold tracking-wider text-gray-900 hover:bg-white"
            aria-label="Copy booking reference"
          >
            {bookingReference}
            {copied ? (
              <Check className="h-4 w-4 text-green-700" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <p className="mt-1 text-xs text-gray-500">
            Use this reference when contacting the host or support.
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          href={
            bookingId
              ? `/account?tab=bookings&booking=${encodeURIComponent(bookingId)}`
              : "/account?tab=bookings"
          }
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
