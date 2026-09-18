import { Link } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import { ordinalWithHost } from "@/lib/host/customer-history-utils";
import type { HostGuestBookingSummary } from "@/lib/host/customer-history-types";
import { formatBookingDate } from "@/lib/mock/dashboard-data";

export function OpsCustomerHistory({
  summary,
  loading,
}: {
  summary: HostGuestBookingSummary | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <p className="text-xs text-gray-400 mt-3">Loading customer history…</p>
    );
  }

  if (!summary || summary.totalBookings === 0) {
    return null;
  }

  const nth = summary.bookingNumberWithHost;

  return (
    <div className="mt-4 space-y-4">
      {nth && nth > 0 ? (
        <div className="rounded-xl bg-green-50 border border-green-100 px-3.5 py-3">
          <p className="text-sm font-semibold text-green-900">
            {ordinalWithHost(nth)} booking with you
          </p>
          <p className="text-xs text-green-800/80 mt-0.5">
            {summary.totalBookings} total · {summary.completedBookings} completed ·{" "}
            {summary.upcomingBookings} upcoming · {summary.cancelledBookings} cancelled
          </p>
        </div>
      ) : null}

      {summary.recentBookings.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Previous bookings
          </p>
          <ul className="space-y-2">
            {summary.recentBookings.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/host/bookings/${encodeURIComponent(row.id)}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:border-green-200 hover:bg-green-50/40"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">
                      {row.property}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {formatBookingDate(row.checkIn)} → {formatBookingDate(row.checkOut)} ·{" "}
                      <span className="capitalize">{row.status}</span>
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
