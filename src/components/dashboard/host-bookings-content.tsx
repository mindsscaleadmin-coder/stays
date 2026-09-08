"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { CalendarRange, ChevronRight, Loader2, X, Zap } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { formatBookingDate, STATUS_STYLES } from "@/lib/mock/dashboard-data";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import type { BookingTimelineTab } from "@/lib/host/host-booking-types";
import {
  displaySpecialRequests,
  filterBookingsByTab,
  getBookingTimeline,
  timelineTabLabel,
} from "@/lib/host/host-booking-utils";
import { cn } from "@/lib/utils";

const TABS: BookingTimelineTab[] = ["upcoming", "ongoing", "past", "all"];

function bookingInDateRange(
  booking: { checkIn: string; checkOut: string },
  from: string,
  to: string
): boolean {
  if (from && booking.checkOut < from) return false;
  if (to && booking.checkIn > to) return false;
  return true;
}

function monthBounds(ym: string): { from: string; to: string } {
  const [year, month] = ym.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(lastDay).padStart(2, "0")}`,
  };
}

function monthFromRange(from: string, to: string): string {
  if (!from || !to || from.slice(0, 7) !== to.slice(0, 7)) return "";
  const bounds = monthBounds(from.slice(0, 7));
  return from === bounds.from && to === bounds.to ? from.slice(0, 7) : "";
}

export function HostBookingsContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("booking");
  const { bookings, ready } = useHostBookings();
  const [tab, setTab] = useState<BookingTimelineTab>("upcoming");

  useEffect(() => {
    if (!focusId) return;
    const found = bookings.find((b) => b.id === focusId);
    if (!found) return;
    const timeline = getBookingTimeline(found);
    setTab(timeline === "all" ? "upcoming" : timeline);
  }, [focusId, bookings]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState<string>("");

  const tabCounts = useMemo(() => {
    const counts = { upcoming: 0, ongoing: 0, past: 0, all: bookings.length };
    for (const b of bookings) {
      const timeline = getBookingTimeline(b);
      if (timeline !== "all") counts[timeline] += 1;
    }
    return counts;
  }, [bookings]);

  const filtered = useMemo(() => {
    let list = filterBookingsByTab(bookings, tab);
    if (status) list = list.filter((b) => b.status === status);
    if (fromDate || toDate) list = list.filter((b) => bookingInDateRange(b, fromDate, toDate));
    return list;
  }, [bookings, tab, status, fromDate, toDate]);

  const hasFilters = Boolean(fromDate || toDate || month || status);

  function applyMonth(value: string) {
    setMonth(value);
    if (!value) {
      setFromDate("");
      setToDate("");
      return;
    }
    const bounds = monthBounds(value);
    setFromDate(bounds.from);
    setToDate(bounds.to);
  }

  function applyFromDate(value: string) {
    setFromDate(value);
    setMonth(monthFromRange(value, toDate));
  }

  function applyToDate(value: string) {
    setToDate(value);
    setMonth(monthFromRange(fromDate, value));
  }

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setMonth("");
    setStatus("");
  }

  if (!ready) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">Bookings</h2>
            <p className="text-gray-500 text-sm mt-1">
              Confirmed stays, check-in/out, and cancellations.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 sm:p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Bookings confirm automatically</p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-lg">
              Guests are confirmed as soon as the dates are available. Control who can book by
              blocking dates or unpublishing a listing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border transition-colors",
                tab === key
                  ? "bg-green-700 border-green-700 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-800"
              )}
            >
              {timelineTabLabel(key)}
              {key !== "all" && tabCounts[key] > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center",
                    tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            <label className="block w-[9.5rem] space-y-1">
              <span className="text-xs font-medium text-gray-600">Month</span>
              <input
                type="month"
                value={month}
                onChange={(e) => applyMonth(e.target.value)}
                className="w-full h-9 border border-gray-200 rounded-lg px-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block w-[9.5rem] space-y-1">
              <span className="text-xs font-medium text-gray-600">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => applyFromDate(e.target.value)}
                className="w-full h-9 border border-gray-200 rounded-lg px-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block w-[9.5rem] space-y-1">
              <span className="text-xs font-medium text-gray-600">To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => applyToDate(e.target.value)}
                className="w-full h-9 border border-gray-200 rounded-lg px-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block w-[9.5rem] space-y-1">
              <span className="text-xs font-medium text-gray-600">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 border border-gray-200 rounded-lg px-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-2.5">
            Showing stays that overlap this range
          </p>
        </div>

        <div className="bg-white rounded-2xl border divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No bookings in this section.
            </div>
          ) : (
            filtered.map((b) => {
              const special = displaySpecialRequests(b);
              return (
                <Link
                  key={b.id}
                  href={`/host/bookings/${b.id}`}
                  className={cn(
                    "p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors cursor-pointer",
                    focusId === b.id && "bg-green-50/70 ring-1 ring-green-200"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-900">{b.guest}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {b.property} · {formatBookingDate(b.checkIn)} →{" "}
                          {formatBookingDate(b.checkOut)} · {b.guests} guests
                        </div>
                        {special && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{special}</p>
                        )}
                        {b.dietaryNeeds && (
                          <p className="text-xs text-amber-700/90 mt-0.5 line-clamp-1">
                            Dietary: {b.dietaryNeeds}
                          </p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Booking{" "}
                          <span className="font-mono font-semibold text-green-800">
                            {b.bookingReference || b.id}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-green-700 mt-1">{b.total}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1 hidden sm:block" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[b.status]}`}
                    >
                      {b.status}
                    </span>
                    {b.checkInStatus === "checked_in" && b.status === "confirmed" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Checked in
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </HostDashboardShell>
  );
}
