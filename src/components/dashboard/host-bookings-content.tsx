"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { CrmPageHeader } from "@/components/dashboard/crm/crm-page-header";
import { CrmStatsBar } from "@/components/dashboard/crm/crm-stats-bar";
import { CrmToolbar } from "@/components/dashboard/crm/crm-toolbar";
import { CrmBookingCard } from "@/components/dashboard/crm/crm-booking-card";
import { CrmEmptyState } from "@/components/dashboard/crm/crm-empty-state";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import type { BookingTimelineTab } from "@/lib/host/host-booking-types";
import { getBookingTimeline, todayIso } from "@/lib/host/host-booking-utils";
import {
  applyCrmBookingFilters,
  bookingNeedsAttention,
  computeCrmBookingStats,
  type CrmCategoryFilter,
} from "@/lib/host/crm-utils";
import type { OperationalStatus } from "@/lib/host/host-ops-types";

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

type AttentionFilter = "all" | "attention" | "unassigned";

export function HostBookingsContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("booking");
  const { bookings, ready } = useHostBookings();

  const [tab, setTab] = useState<BookingTimelineTab>("upcoming");
  const [category, setCategory] = useState<CrmCategoryFilter>(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl === "stay" || fromUrl === "experience") return fromUrl;
    return "all";
  });
  const [query, setQuery] = useState("");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState("");
  const [opsStatus, setOpsStatus] = useState<OperationalStatus | "">("");

  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl === "stay" || fromUrl === "experience") {
      setCategory(fromUrl);
      return;
    }
    if (fromUrl === "dining" || fromUrl === "event") {
      setCategory("all");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!focusId) return;
    const found = bookings.find((b) => b.id === focusId);
    if (!found) return;
    const timeline = getBookingTimeline(found);
    setTab(timeline === "all" ? "upcoming" : timeline);
  }, [focusId, bookings]);

  useEffect(() => {
    if (!ready || bookings.length === 0 || focusId) return;
    const upcomingCount = bookings.filter((b) => getBookingTimeline(b) === "upcoming").length;
    const ongoingCount = bookings.filter((b) => getBookingTimeline(b) === "ongoing").length;
    if (upcomingCount === 0 && ongoingCount > 0) {
      setTab("ongoing");
    }
  }, [ready, bookings, focusId]);

  const stats = useMemo(() => computeCrmBookingStats(bookings), [bookings]);

  const tabCounts = useMemo(() => {
    const counts: Record<BookingTimelineTab, number> = {
      upcoming: 0,
      ongoing: 0,
      past: 0,
      all: bookings.length,
    };
    for (const booking of bookings) {
      const timeline = getBookingTimeline(booking);
      if (timeline !== "all") counts[timeline] += 1;
    }
    return counts;
  }, [bookings]);

  const filtered = useMemo(() => {
    let list = applyCrmBookingFilters(bookings, {
      tab,
      category,
      query,
      fromDate,
      toDate,
      status,
      opsStatus,
    });

    if (attentionFilter === "attention") {
      list = list.filter((booking) => bookingNeedsAttention(booking));
    } else if (attentionFilter === "unassigned") {
      list = list.filter((booking) => !booking.assignedStaffName);
    }

    return list;
  }, [
    bookings,
    tab,
    category,
    query,
    fromDate,
    toDate,
    status,
    opsStatus,
    attentionFilter,
  ]);

  const hasFilters = Boolean(
    fromDate || toDate || month || status || opsStatus || query || category !== "all"
  );

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
    setOpsStatus("");
    setQuery("");
    setCategory("all");
    setAttentionFilter("all");
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
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Bookings</h2>
          <p className="text-gray-500 text-sm mt-1">
            Confirmed stays and paid experiences.
          </p>
        </div>

        <CrmPageHeader
          title="Bookings"
          summary={
            <CrmStatsBar
              embedded
              items={[
                {
                  key: "today",
                  label: "Today",
                  value: stats.today,
                  tone: "green",
                  active:
                    Boolean(fromDate && toDate && fromDate === todayIso() && toDate === todayIso()),
                  onClick: () => {
                    const today = todayIso();
                    applyMonth("");
                    setFromDate(today);
                    setToDate(today);
                    setTab("all");
                    setAttentionFilter("all");
                  },
                },
                {
                  key: "attention",
                  label: "Needs attention",
                  value: stats.needsAttention,
                  tone: "amber",
                  active: attentionFilter === "attention",
                  onClick: () => {
                    setFromDate("");
                    setToDate("");
                    setMonth("");
                    setAttentionFilter("attention");
                    setTab("all");
                  },
                },
                {
                  key: "unassigned",
                  label: "Unassigned",
                  value: stats.unassigned,
                  tone: "default",
                  active: attentionFilter === "unassigned",
                  onClick: () => {
                    setFromDate("");
                    setToDate("");
                    setMonth("");
                    setAttentionFilter("unassigned");
                    setTab("all");
                  },
                },
              ]}
            />
          }
        />

        <CrmToolbar
          query={query}
          onQueryChange={setQuery}
          tab={tab}
          onTabChange={(next) => {
            setTab(next);
            setAttentionFilter("all");
          }}
          tabCounts={tabCounts}
          category={category}
          onCategoryChange={setCategory}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((open) => !open)}
          hasFilters={hasFilters || attentionFilter !== "all"}
          onClearFilters={clearFilters}
          month={month}
          onMonthChange={applyMonth}
          fromDate={fromDate}
          onFromDateChange={applyFromDate}
          toDate={toDate}
          onToDateChange={applyToDate}
          status={status}
          onStatusChange={setStatus}
          opsStatus={opsStatus}
          onOpsStatusChange={setOpsStatus}
        />

        {attentionFilter !== "all" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3.5 shadow-sm">
            <p className="text-sm text-amber-950 leading-relaxed">
              {attentionFilter === "attention"
                ? "Bookings that need a team action."
                : "Bookings without an assigned team member."}
            </p>
            <button
              type="button"
              onClick={() => setAttentionFilter("all")}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 shrink-0"
            >
              Clear
            </button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <CrmEmptyState
            icon={CalendarDays}
            title="No bookings match this view"
            description={
              hasFilters || attentionFilter !== "all"
                ? "Try clearing filters or switching tabs."
                : "New bookings appear here when guests confirm or you approve an enquiry."
            }
          />
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                {filtered.length} booking{filtered.length === 1 ? "" : "s"}
              </h3>
            </div>
            <div className="grid gap-2.5">
              {filtered.map((booking) => (
                <CrmBookingCard
                  key={booking.id}
                  booking={booking}
                  highlighted={focusId === booking.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </HostDashboardShell>
  );
}
