"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchAvailabilityState } from "@/lib/host/host-availability-api";
import {
  calendarMonthLabel,
  daysInMonthGrid,
  earliestBookableCheckInIso,
  isDateUnavailable,
  isSeasonallyClosed,
} from "@/lib/host/host-availability-utils";
import type { ListingAvailabilitySettings } from "@/lib/host/host-availability-types";

const CALENDAR_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function displayDayAppearance(
  iso: string,
  opts: {
    calendarMinIso: string;
    occupiedDateSet: Set<string>;
    availability: ListingAvailabilitySettings | null;
  }
): { className: string; title: string } {
  const { calendarMinIso, occupiedDateSet, availability } = opts;
  const past = iso < calendarMinIso;
  const booked = occupiedDateSet.has(iso);
  const blocked = Boolean(availability) && availability!.blockedDates.includes(iso);
  const seasonClosed =
    Boolean(availability) && isSeasonallyClosed(iso, availability!.seasonalPeriods);
  const channel =
    Boolean(availability) &&
    (availability!.icalImportedDates ?? []).includes(iso) &&
    !booked;
  const unavailable = Boolean(availability) && isDateUnavailable(iso, availability!);
  const disabled = past || unavailable;

  const title = past
    ? "Past date"
    : blocked
      ? "Blocked"
      : seasonClosed
        ? "Seasonal closure"
        : booked
          ? "Booked"
          : channel
            ? "Unavailable (channel calendar)"
            : "Available";

  const className = disabled
    ? past && !unavailable
      ? "border-transparent text-gray-300"
      : blocked
        ? "bg-red-100 border-red-300 text-red-900"
        : seasonClosed
          ? "bg-amber-100 border-amber-300 text-amber-900"
          : booked
            ? "bg-blue-100 border-blue-300 text-blue-900"
            : channel
              ? "bg-slate-100 border-slate-300 text-slate-800"
              : "bg-gray-100 border-gray-200 text-gray-400"
    : "bg-green-50 border-green-200 text-gray-800 font-medium";

  return { className, title };
}

export function ListingAvailabilityCalendar({
  listingId,
  title = "Availability",
  className,
}: {
  listingId: string;
  title?: string;
  className?: string;
}) {
  const [availability, setAvailability] = useState<ListingAvailabilitySettings | null>(null);
  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [displayCalendarStart, setDisplayCalendarStart] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    let active = true;
    void fetchAvailabilityState(listingId)
      .then((state) => {
        if (!active) return;
        setAvailability(state?.settings ?? null);
        setOccupiedDates(state?.occupiedDates ?? []);
      })
      .catch(() => {
        if (!active) return;
        setAvailability(null);
        setOccupiedDates([]);
      });
    return () => {
      active = false;
    };
  }, [listingId]);

  const occupiedDateSet = useMemo(() => new Set(occupiedDates), [occupiedDates]);

  const calendarMinIso = earliestBookableCheckInIso(availability?.advanceNoticeDays ?? 0);

  const displayCalendarMonths = useMemo(() => {
    return Array.from({ length: 3 }, (_, index) => {
      const d = new Date(displayCalendarStart.year, displayCalendarStart.month + index, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const cells = daysInMonthGrid(year, month).map((iso) =>
        iso ? { iso, day: Number(iso.slice(8, 10)) } : null
      );
      return {
        year,
        month,
        title: calendarMonthLabel(year, month),
        cells,
      };
    });
  }, [displayCalendarStart]);

  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-heading-sm font-extrabold text-gray-950">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous months"
            onClick={() =>
              setDisplayCalendarStart((m) => {
                const d = new Date(m.year, m.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next months"
            onClick={() =>
              setDisplayCalendarStart((m) => {
                const d = new Date(m.year, m.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {displayCalendarMonths.map((month) => (
          <div key={`${month.year}-${month.month}`}>
            <h3 className="mb-2 text-center text-sm font-semibold text-gray-900">{month.title}</h3>
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {CALENDAR_WEEKDAYS.map((label) => (
                <div
                  key={`${month.year}-${month.month}-${label}`}
                  className="py-1 text-center text-[10px] font-semibold text-gray-400"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {month.cells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${month.year}-${month.month}-${idx}`} className="h-8" />;
                }
                const { className: dayClassName, title: dayTitle } = displayDayAppearance(
                  cell.iso,
                  {
                    calendarMinIso,
                    occupiedDateSet,
                    availability,
                  }
                );
                return (
                  <div
                    key={cell.iso}
                    title={dayTitle}
                    className={`flex h-8 items-center justify-center rounded-md border text-xs tabular-nums ${dayClassName}`}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-red-300 bg-red-100" />
          Blocked
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-100" />
          Seasonal
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-blue-300 bg-blue-100" />
          Booked
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-slate-100" />
          Channel
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-green-200 bg-green-50" />
          Open
        </span>
      </div>
    </section>
  );
}
