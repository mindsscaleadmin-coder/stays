"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { CheckCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

async function confirmStripeReturn(bookingId: string, sessionId?: string) {
  const res = await fetch(`/api/bookings/${bookingId}/confirm-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { paid?: boolean };
  return Boolean(data.paid);
}

async function waitForPaidBooking(bookingId: string, maxAttempts = 12) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`/api/bookings/${bookingId}`);
    const data = (await res.json()) as { booking?: { paymentStatus?: string } };
    if (res.ok && data.booking?.paymentStatus === "paid") return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

export function CartSuccessContent() {
  const searchParams = useSearchParams();
  const bookingIdsParam = searchParams.get("bookingIds") || "";
  const ids = bookingIdsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sessionId = searchParams.get("session_id") || undefined;
  const count = Number(searchParams.get("count")) || ids.length;
  const [ready, setReady] = useState(ids.length === 0);
  const [paid, setPaid] = useState(ids.length === 0);

  useEffect(() => {
    const bookingIds = bookingIdsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (bookingIds.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const first = bookingIds[0];
        const ok =
          (sessionId ? await confirmStripeReturn(first, sessionId) : false) ||
          (await waitForPaidBooking(first));
        if (!cancelled) setPaid(ok);
      } catch {
        if (!cancelled) setPaid(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingIdsParam, sessionId]);

  if (!ready) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
        <p className="text-sm text-gray-500">Confirming your payment…</p>
      </div>
    );
  }

  if (ids.length > 0 && !paid) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <Loader2 className="w-12 h-12 text-amber-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Payment is still processing</h1>
        <p className="text-gray-600">
          Stripe has not marked these bookings paid yet. Refresh in a moment, or open My
          trips — host calendars update as soon as payment clears.
        </p>
        <Link
          href={
            ids[0]
              ? `/account?tab=bookings&booking=${encodeURIComponent(ids[0])}`
              : "/account?tab=bookings"
          }
          className="inline-flex justify-center bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          View my trips
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
        Bookings confirmed
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {count} stay{count === 1 ? "" : "s"} booked from your cart.
        Hosts will see each booking on their calendar.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={
            ids[0]
              ? `/account?tab=bookings&booking=${encodeURIComponent(ids[0])}`
              : "/account?tab=bookings"
          }
          className="inline-flex justify-center bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          View my trips
        </Link>
        <Link
          href="/listings"
          className="inline-flex justify-center border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50"
        >
          Keep browsing
        </Link>
      </div>
    </div>
  );
}
