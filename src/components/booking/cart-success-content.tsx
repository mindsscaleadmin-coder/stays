"use client";

import { Link } from "@/i18n/routing";
import { CheckCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function CartSuccessContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("bookingIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const count = Number(searchParams.get("count")) || ids.length;

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
      {ids.length > 0 && (
        <ul className="text-xs text-gray-500 mb-6 space-y-1 font-mono">
          {ids.map((id) => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/account?tab=bookings"
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
