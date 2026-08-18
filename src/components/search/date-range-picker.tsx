"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(value: string): string {
  return format(parseISO(value), "dd MMM yyyy");
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus();
  try {
    input.showPicker();
  } catch {
    input.click();
  }
}

function DateHalf({
  id,
  label,
  value,
  min,
  placeholder,
  onChange,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  min: string;
  placeholder: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
}) {
  return (
    <div className="relative min-w-0 flex-1 p-3">
      <button
        type="button"
        onClick={() => openDatePicker(inputRef.current)}
        className="w-full text-start hover:bg-gray-50 rounded-md transition-colors -m-1 p-1"
      >
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
          {label}
        </span>
        <span
          className={cn(
            "block text-sm truncate",
            value ? "font-semibold text-gray-900" : "text-gray-400"
          )}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </span>
      </button>
      <input
        ref={inputRef}
        id={id}
        type="date"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}

export function DateRangePicker({
  checkIn,
  checkOut,
  minDate,
  onCheckInChange,
  onCheckOutChange,
  compact = false,
}: {
  checkIn: string;
  checkOut: string;
  minDate: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("home.search");
  const [open, setOpen] = useState(false);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const checkOutMin = checkIn ? addDays(checkIn, 1) : addDays(minDate, 1);

  const displayText =
    checkIn && checkOut
      ? `${formatDisplayDate(checkIn)} – ${formatDisplayDate(checkOut)}`
      : checkIn
        ? formatDisplayDate(checkIn)
        : "";

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => openDatePicker(checkInRef.current), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open]);

  function handleCheckInChange(value: string) {
    onCheckInChange(value);
    if (value && checkOut && checkOut <= value) {
      onCheckOutChange(addDays(value, 1));
    }
    window.setTimeout(() => openDatePicker(checkOutRef.current), 150);
  }

  function handleCheckOutChange(value: string) {
    onCheckOutChange(value);
    if (value) setOpen(false);
  }

  return (
    <div className="relative">
      <label
        htmlFor="search-dates-trigger"
        className={cn(
          "block font-medium text-gray-500 mb-1",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        {t("checkIn")}
      </label>
      <div className="relative">
        <Calendar
          className={cn(
            "absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10",
            compact ? "w-3.5 h-3.5" : "w-4 h-4"
          )}
        />
        <button
          id="search-dates-trigger"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "w-full ps-9 pe-2 border rounded-lg text-start transition-colors",
            compact ? "py-2 text-xs" : "py-2.5 text-sm",
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

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close calendar"
          />
          <div className="absolute start-0 top-full mt-2 z-50 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              <DateHalf
                id="search-checkin"
                label={t("checkIn")}
                value={checkIn}
                min={minDate}
                placeholder={t("datePlaceholder")}
                onChange={handleCheckInChange}
                inputRef={checkInRef}
              />
              <DateHalf
                id="search-checkout"
                label={t("checkOut")}
                value={checkOut}
                min={checkOutMin}
                placeholder={t("datePlaceholder")}
                onChange={handleCheckOutChange}
                inputRef={checkOutRef}
              />
            </div>
            {(checkIn || checkOut) && (
              <div className="border-t border-gray-200 px-3 py-2">
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
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
