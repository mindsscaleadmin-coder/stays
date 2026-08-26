"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import {
  CalendarRange,
  CheckCircle,
  ChevronRight,
  Loader2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { formatBookingDate, STATUS_STYLES } from "@/lib/mock/dashboard-data";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import { usePlatformConfig } from "@/lib/admin/use-admin-platform-config";
import type { BookingTimelineTab } from "@/lib/host/host-booking-types";
import {
  displaySpecialRequests,
  filterBookingsByTab,
  getBookingTimeline,
  timelineTabLabel,
} from "@/lib/host/host-booking-utils";
import { cn } from "@/lib/utils";

const TABS: BookingTimelineTab[] = ["requests", "upcoming", "ongoing", "past", "all"];

function bookingInDateRange(
  booking: { checkIn: string; checkOut: string },
  from: string,
  to: string
): boolean {
  if (from && booking.checkOut < from) return false;
  if (to && booking.checkIn > to) return false;
  return true;
}

export function HostBookingsContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("booking");
  const { bookings, ready, instantBookEnabled, setInstantBookEnabled, accept, decline } =
    useHostBookings();
  const platformConfig = usePlatformConfig();
  const instantBookPlatformEnabled =
    platformConfig.features.instantBookingPlatformWide &&
    platformConfig.features.hostFeatures.instantBooking;
  const [tab, setTab] = useState<BookingTimelineTab>("requests");

  useEffect(() => {
    if (!focusId) return;
    const found = bookings.find((b) => b.id === focusId);
    if (!found) return;
    const timeline = getBookingTimeline(found);
    setTab(timeline === "all" ? "requests" : timeline);
  }, [focusId, bookings]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState("");

  const tabCounts = useMemo(() => {
    const counts = { requests: 0, upcoming: 0, ongoing: 0, past: 0, all: bookings.length };
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

  const hasFilters = Boolean(fromDate || toDate || status);

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setStatus("");
  }

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  async function handleAccept(id: string) {
    try {
      await accept(id);
      flash("Booking accepted — it’s on your calendar.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not accept booking.");
    }
  }

  async function handleDecline(id: string) {
    try {
      await decline(id);
      flash("Booking declined.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not decline booking.");
    }
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
              Manage requests, upcoming stays, check-in/out, and cancellations.
            </p>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Instant book</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                When enabled, new guest bookings are confirmed automatically instead of waiting
                for your approval.
                {!instantBookPlatformEnabled && (
                  <span className="block text-amber-600 mt-1">
                    Instant booking is currently disabled platform-wide by admin.
                  </span>
                )}
              </p>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 shrink-0 cursor-pointer">
            <span className="text-xs font-medium text-gray-600">
              {instantBookEnabled ? "On" : "Off"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={instantBookEnabled}
              disabled={!instantBookPlatformEnabled}
              onClick={() => {
                if (!instantBookPlatformEnabled) return;
                void setInstantBookEnabled(!instantBookEnabled).catch((error) => {
                  flash(error instanceof Error ? error.message : "Could not save instant book.");
                });
              }}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                instantBookEnabled ? "bg-green-600" : "bg-gray-300",
                !instantBookPlatformEnabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 start-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  instantBookEnabled && "translate-x-5"
                )}
              />
            </button>
          </label>
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
          <div className="flex items-center gap-2 mb-3">
            <CalendarRange className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filter by date</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-gray-600">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-gray-600">To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-gray-600">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="declined">Declined</option>
              </select>
            </label>
            <div className="flex items-end">
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg w-full sm:w-auto justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              ) : (
                <p className="text-xs text-gray-400 pb-2">Showing stays that overlap this range</p>
              )}
            </div>
          </div>
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
                        <div className="font-semibold text-gray-900">
                          {b.guest}
                        </div>
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
                        <div className="text-xs text-gray-400 mt-1 font-mono">{b.id}</div>
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
                    {b.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAccept(b.id);
                          }}
                          className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDecline(b.id);
                          }}
                          className="flex items-center gap-1 text-xs border border-gray-300 hover:border-red-400 text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-lg font-medium"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </>
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
