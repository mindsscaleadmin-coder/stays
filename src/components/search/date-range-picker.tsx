"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatDisplayDate(value: string): string {
  return format(parseISO(value), "dd MMM");
}

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  const startPad = first.getDay();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatDateRangeLabel(checkIn: string, checkOut: string): string {
  if (checkIn && checkOut) {
    return `${formatDisplayDate(checkIn)} – ${formatDisplayDate(checkOut)}`;
  }
  if (checkIn) return formatDisplayDate(checkIn);
  return "";
}

export function DateRangePicker({
  checkIn,
  checkOut,
  minDate,
  onCheckInChange,
  onCheckOutChange,
  compact = false,
  chrome = "field",
  open: openProp,
  onOpenChange,
}: {
  checkIn: string;
  checkOut: string;
  minDate: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  compact?: boolean;
  chrome?: "field" | "none";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("home.search");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const [month, setMonth] = useState(() =>
    startOfMonth(checkIn ? parseISO(checkIn) : new Date())
  );

  function setOpen(next: boolean) {
    if (onOpenChange) onOpenChange(next);
    else setUncontrolledOpen(next);
  }

  const min = startOfDay(parseISO(minDate));
  const checkInDate = checkIn ? parseISO(checkIn) : null;
  const checkOutDate = checkOut ? parseISO(checkOut) : null;
  const cells = useMemo(() => buildMonthCells(month), [month]);

  const displayText = formatDateRangeLabel(checkIn, checkOut);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function pickDay(date: Date) {
    const iso = toIso(date);
    if (isBefore(date, min)) return;

    if (!checkIn || (checkIn && checkOut)) {
      onCheckInChange(iso);
      onCheckOutChange("");
      return;
    }
    if (iso <= checkIn) {
      onCheckInChange(iso);
      onCheckOutChange("");
      return;
    }
    onCheckOutChange(iso);
  }

  function dayState(date: Date) {
    const disabled = isBefore(date, min);
    const isStart = checkInDate ? isSameDay(date, checkInDate) : false;
    const isEnd = checkOutDate ? isSameDay(date, checkOutDate) : false;
    const inRange =
      checkInDate &&
      checkOutDate &&
      isAfter(date, checkInDate) &&
      isBefore(date, checkOutDate);
    const isToday = isSameDay(date, new Date());
    return { disabled, isStart, isEnd, inRange, isToday };
  }

  const calendarPanel = open ? (
    <>
      {chrome === "field" && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setOpen(false)}
          aria-label="Close calendar"
        />
      )}
      <div
        className={cn(
          "absolute top-full mt-2 z-50 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white shadow-xl p-3",
          chrome === "none" ? "start-0 sm:start-auto sm:end-0" : "end-0"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-bold text-gray-900">{format(month, "MMMM yyyy")}</p>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg bg-gray-50 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {t("checkIn")}
            </p>
            <p className={cn("text-xs font-semibold", checkIn ? "text-gray-900" : "text-gray-400")}>
              {checkIn ? formatDisplayDate(checkIn) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {t("checkOut")}
            </p>
            <p className={cn("text-xs font-semibold", checkOut ? "text-gray-900" : "text-gray-400")}>
              {checkOut ? formatDisplayDate(checkOut) : "—"}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mb-2">{t("dateHint")}</p>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="h-7 text-[10px] font-semibold text-gray-400 flex items-center justify-center"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="h-8" />;
            }
            const { disabled, isStart, isEnd, inRange, isToday } = dayState(date);
            const selected = isStart || isEnd;
            return (
              <button
                key={toIso(date)}
                type="button"
                disabled={disabled}
                onClick={() => pickDay(date)}
                className={cn(
                  "h-8 text-xs rounded-full mx-auto w-8 flex items-center justify-center transition-colors",
                  disabled && "text-gray-300 cursor-not-allowed",
                  !disabled && !selected && !inRange && "text-gray-800 hover:bg-green-50",
                  inRange && "bg-green-50 text-green-800 rounded-none w-full",
                  selected && "bg-green-700 text-white font-semibold hover:bg-green-800",
                  isToday && !selected && "ring-1 ring-green-600"
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              onCheckInChange("");
              onCheckOutChange("");
            }}
            className="text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            {t("clearFilters")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-white bg-green-700 hover:bg-green-800 px-3 py-1.5 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </>
  ) : null;

  if (chrome === "none") {
    return <div className="relative">{calendarPanel}</div>;
  }

  return (
    <div className="relative">
      <label
        htmlFor="search-dates-trigger"
        className={cn(
          "block font-medium text-gray-500 mb-1 truncate",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        {t("dates")}
      </label>
      <div className="relative">
        <Calendar
          className={cn(
            "absolute start-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10",
            compact ? "w-3.5 h-3.5" : "w-4 h-4"
          )}
        />
        <button
          id="search-dates-trigger"
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={cn(
            "w-full border rounded-lg text-start transition-colors",
            compact ? "ps-7 pe-2 py-2 text-xs" : "ps-9 pe-2 py-2.5 text-sm",
            open
              ? "border-green-500 ring-2 ring-green-500 bg-white"
              : "border-gray-200 bg-white hover:border-gray-300"
          )}
        >
          <span className={cn("block truncate", displayText ? "text-gray-900" : "text-gray-400")}>
            {displayText || t("datePlaceholder")}
          </span>
        </button>
      </div>
      {calendarPanel}
    </div>
  );
}
