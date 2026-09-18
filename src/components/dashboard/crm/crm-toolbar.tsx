"use client";

import { CalendarRange, Search, SlidersHorizontal, X } from "lucide-react";
import type { BookingTimelineTab } from "@/lib/host/host-booking-types";
import type { HostBookingCategory } from "@/lib/host/booking-category";
import { hostBookingCategoryLabel } from "@/lib/host/booking-category";
import { timelineTabLabel } from "@/lib/host/host-booking-utils";
import { operationalStatusLabel } from "@/lib/host/operational-status";
import type { OperationalStatus } from "@/lib/host/host-ops-types";
import type { CrmCategoryFilter } from "@/lib/host/crm-utils";
import { cn } from "@/lib/utils";

const OPS_STATUS_FILTER_OPTIONS: OperationalStatus[] = [
  "confirmed",
  "upcoming",
  "in_progress",
  "completed",
  "cancelled",
];

/** Bookings page — paid categories only; event/dining live under Enquiries. */
const CATEGORY_OPTIONS: CrmCategoryFilter[] = ["all", "stay", "experience"];

export function CrmToolbar({
  query,
  onQueryChange,
  tab,
  onTabChange,
  tabCounts,
  category,
  onCategoryChange,
  showFilters,
  onToggleFilters,
  hasFilters,
  onClearFilters,
  month,
  onMonthChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  status,
  onStatusChange,
  opsStatus,
  onOpsStatusChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  tab: BookingTimelineTab;
  onTabChange: (tab: BookingTimelineTab) => void;
  tabCounts: Record<BookingTimelineTab, number>;
  category: CrmCategoryFilter;
  onCategoryChange: (category: CrmCategoryFilter) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  month: string;
  onMonthChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  opsStatus: OperationalStatus | "";
  onOpsStatusChange: (value: OperationalStatus | "") => void;
}) {
  const tabs: BookingTimelineTab[] = ["upcoming", "ongoing", "past", "all"];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-100 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search guest, property, reference, or staff…"
              className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)]/30 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleFilters}
              className={cn(
                "inline-flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-semibold transition-colors",
                showFilters || hasFilters
                  ? "bg-[var(--brand-green)]/[0.08] border-[var(--brand-green)]/25 text-[var(--brand-green-dark)]"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            {hasFilters ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/80 rounded-xl">
            {tabs.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                  tab === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {timelineTabLabel(key)}
                {tabCounts[key] > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center tabular-nums",
                      tab === key ? "bg-gray-100 text-gray-700" : "bg-white/60 text-gray-500"
                    )}
                  >
                    {tabCounts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onCategoryChange(value)}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
                  category === value
                    ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {value === "all"
                  ? "All types"
                  : hostBookingCategoryLabel(value as HostBookingCategory)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showFilters ? (
        <div className="px-3 sm:px-4 py-3 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-2.5">
            <CalendarRange className="w-4 h-4 text-[var(--brand-green)]" />
            <h3 className="text-sm font-semibold text-gray-900">Date & status</h3>
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            <label className="block w-[9.5rem] space-y-1.5">
              <span className="text-xs font-medium text-gray-500">Month</span>
              <input
                type="month"
                value={month}
                onChange={(e) => onMonthChange(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
              />
            </label>
            <label className="block w-[9.5rem] space-y-1.5">
              <span className="text-xs font-medium text-gray-500">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
              />
            </label>
            <label className="block w-[9.5rem] space-y-1.5">
              <span className="text-xs font-medium text-gray-500">To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => onToDateChange(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
              />
            </label>
            <label className="block w-[9.5rem] space-y-1.5">
              <span className="text-xs font-medium text-gray-500">Booking status</span>
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
              >
                <option value="">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="block w-[9.5rem] space-y-1.5">
              <span className="text-xs font-medium text-gray-500">Ops status</span>
              <select
                value={opsStatus}
                onChange={(e) => onOpsStatusChange(e.target.value as OperationalStatus | "")}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
              >
                <option value="">All ops statuses</option>
                {OPS_STATUS_FILTER_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {operationalStatusLabel(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Showing bookings that overlap the selected date range
          </p>
        </div>
      ) : null}
    </div>
  );
}
