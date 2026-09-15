"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import {
  CalendarCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  EventEnquiryModal,
  type EventEnquiryDraft,
} from "@/components/listing/event-enquiry-modal";
import type { EventAvailabilityRequestForGuest } from "@/lib/events/event-availability-types";
import type { EventSpace } from "@/lib/listings/event-space-types";
import { fetchAvailabilityState } from "@/lib/host/host-availability-api";
import { isDateUnavailable } from "@/lib/host/host-availability-utils";
import type { ListingAvailabilitySettings } from "@/lib/host/host-availability-types";

function formatDate(iso: string | undefined, locale: string) {
  if (!iso) return "Flexible date";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      day: index + 1,
      iso: toIsoDate(year, monthIndex, index + 1),
    })),
  ];
}

function whatsappHref(raw: string, listingTitle: string, eventDate: string) {
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const text = encodeURIComponent(
    `Hi, you confirmed ${eventDate} is available at “${listingTitle}”. I'd like to take it forward.`
  );
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * Events are enquire-only and contact details are withheld: the guest requests a
 * date, and the host's WhatsApp is revealed only after the host confirms it.
 */
export function EventAvailabilityRequestCard({
  listingId,
  listingTitle,
  spaces,
  rating,
  reviewCount,
  locale,
}: {
  listingId: string;
  listingTitle: string;
  spaces: EventSpace[];
  rating: number;
  reviewCount: number;
  locale: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<EventAvailabilityRequestForGuest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultSpaceId = spaces[0]?.id ?? spaces[0]?.name ?? "";
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [availability, setAvailability] = useState<ListingAvailabilitySettings | null>(null);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const load = useCallback(async () => {
    if (!user?.id) {
      setRequests([]);
      setLoaded(true);
      return;
    }
    try {
      const res = await fetch(
        `/api/event-requests?role=guest&guestId=${encodeURIComponent(user.id)}&listingId=${encodeURIComponent(listingId)}`
      );
      const data = res.ok
        ? ((await res.json()) as { requests?: EventAvailabilityRequestForGuest[] })
        : null;
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch {
      setRequests([]);
    } finally {
      setLoaded(true);
    }
  }, [user?.id, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    void fetchAvailabilityState(listingId)
      .then((state) => {
        if (active) setAvailability(state?.settings ?? null);
      })
      .catch(() => {
        if (active) setAvailability(null);
      })
      .finally(() => {
        if (active) setAvailabilityLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [listingId]);

  /** Poll while a request is awaiting the host so the guest sees the reply. */
  const hasPending = requests.some((r) => r.status === "pending");
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [hasPending, load]);

  const latest = requests[0] ?? null;
  const confirmed = useMemo(
    () => requests.find((r) => r.status === "available") ?? null,
    [requests]
  );
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const requestByDate = useMemo(() => {
    const statuses = new Map<string, EventAvailabilityRequestForGuest["status"]>();
    for (const request of requests) {
      if (request.eventDate && !statuses.has(request.eventDate)) {
        statuses.set(request.eventDate, request.status);
      }
    }
    return statuses;
  }, [requests]);
  const todayIso = useMemo(() => {
    const now = new Date();
    return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  async function submit(draft: EventEnquiryDraft): Promise<boolean> {
    if (!user?.id) return false;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/event-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          occasion: draft.occasion,
          partyType: draft.partyType,
          eventDate: draft.eventDate,
          dateFlexible: draft.dateFlexible,
          guestCount: draft.guestCount,
          guestName: user.fullName || "Guest",
          guestEmail: user.email || undefined,
          guestPhone: draft.guestPhone,
          guestId: user.id,
          spaceId: draft.spaceId,
          spaceName: draft.spaceName,
          message: draft.message,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not send the request. Try again.");
        return false;
      }
      await load();
      // The date now shows as pending on the calendar, so drop the selection.
      setSelectedDate(null);
      return true;
    } catch {
      setError("Could not send the request. Check your connection and try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      id="booking-calculator"
      className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
    >
      <div className="flex gap-2.5">
        <div className="flex-1 rounded-xl border border-gray-200 p-2 text-center text-xs">
          <b className="block text-sm text-gray-900">
            {reviewCount > 0 ? `${rating.toFixed(1)} ★` : "New"}
          </b>
          rating
        </div>
        <div className="flex-1 rounded-xl border border-gray-200 p-2 text-center text-xs">
          <b className="block text-sm text-gray-900">{reviewCount}</b>
          reviews
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
          <div>
            <p className="text-body-sm font-bold text-gray-950">Availability calendar</p>
            <p className="text-2xs text-gray-500">Tap an open date to enquire</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setCalendarMonth(
                  (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1)
                )
              }
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[92px] text-center text-xs font-semibold text-gray-800">
              {calendarMonth.toLocaleDateString(locale, { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setCalendarMonth(
                  (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1)
                )
              }
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 text-center text-[9px] font-semibold uppercase text-gray-400">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
            {calendarDays.map((cell, index) => {
              if (!cell) return <span key={`empty-${index}`} className="h-8" />;
              const requestStatus = requestByDate.get(cell.iso);
              const isPast = cell.iso < todayIso;
              const isBlocked =
                Boolean(availability) && isDateUnavailable(cell.iso, availability!);
              const unavailable = isPast || isBlocked || requestStatus === "unavailable";
              const pending = requestStatus === "pending";
              const available = requestStatus === "available";
              const selected = selectedDate === cell.iso;
              const selectable = !unavailable && !pending && !available;

              const dayClass = [
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-3xs font-medium transition-colors",
                selected
                  ? "bg-green-800 font-bold text-white ring-2 ring-green-800 ring-offset-1"
                  : available
                    ? "bg-green-700 font-bold text-white"
                    : pending
                      ? "border border-amber-300 bg-amber-100 font-bold text-amber-900"
                      : unavailable
                        ? "text-gray-300 line-through"
                        : availabilityLoaded
                          ? "bg-green-50 text-green-800 hover:bg-green-100"
                          : "animate-pulse bg-gray-100 text-gray-400",
              ].join(" ");

              const dayTitle = available
                ? "Host confirmed available"
                : pending
                  ? "Awaiting host confirmation"
                  : unavailable
                    ? "Unavailable"
                    : "Available — tap to enquire";

              if (!selectable) {
                return (
                  <span key={cell.iso} title={dayTitle} className={dayClass}>
                    {cell.day}
                  </span>
                );
              }

              return (
                <button
                  key={cell.iso}
                  type="button"
                  title={dayTitle}
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedDate((current) => (current === cell.iso ? null : cell.iso));
                    setError(null);
                  }}
                  className={dayClass}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-green-50 px-2.5 py-2">
              <span className="text-3xs font-semibold text-green-900">
                {formatDate(selectedDate, locale)} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-2xs font-semibold text-green-800 underline underline-offset-2"
              >
                Clear
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-[9px] text-gray-500">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-100" />Open</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-200" />Pending</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-700" />Confirmed</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-gray-200" />Unavailable</span>
          </div>
        </div>
      </section>

      {/* Confirmed — contact details unlocked */}
      {confirmed && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3.5">
          <p className="flex items-center gap-2 text-body-sm font-bold text-green-900">
            <CheckCircle className="h-4 w-4" /> Date confirmed available
          </p>
          <p className="mt-1 text-xs text-green-900">
            {confirmed.spaceName ? `${confirmed.spaceName} · ` : ""}
            {confirmed.dateFlexible ? "Flexible date" : formatDate(confirmed.eventDate, locale)}
          </p>
          {confirmed.hostNote && (
            <p className="mt-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs text-gray-700">
              “{confirmed.hostNote}”
            </p>
          )}
          {confirmed.hostContact?.whatsapp ? (
            <a
              href={whatsappHref(
                confirmed.hostContact.whatsapp,
                listingTitle,
                confirmed.dateFlexible ? "a flexible date" : formatDate(confirmed.eventDate, locale)
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3 text-sm font-bold text-white hover:bg-green-800"
            >
              <MessageCircle className="h-4 w-4" />
              Message {confirmed.hostContact.displayName} on WhatsApp
            </a>
          ) : (
            <p className="mt-2 text-xs text-green-900">
              The host confirmed your date and will reach out to you directly.
            </p>
          )}
        </div>
      )}

      {/* Declined */}
      {!confirmed && latest?.status === "unavailable" && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
          <p className="flex items-center gap-2 text-body-sm font-bold text-gray-900">
            <XCircle className="h-4 w-4 text-gray-500" /> Not available on{" "}
            {latest.dateFlexible ? "the requested flexible dates" : formatDate(latest.eventDate, locale)}
          </p>
          {latest.hostNote && (
            <p className="mt-2 rounded-lg bg-white px-2.5 py-2 text-xs text-gray-700">
              “{latest.hostNote}”
            </p>
          )}
          <p className="mt-2 text-xs text-gray-600">You can send another enquiry.</p>
        </div>
      )}

      {/* Request form */}
      {!confirmed && (
        <>
          {error && !enquiryOpen && (
            <p role="status" aria-live="polite" className="mt-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          {authLoading || !loaded ? (
            <div className="mt-3.5 h-12 animate-pulse rounded-xl bg-gray-100" />
          ) : user?.id ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setEnquiryOpen(true);
              }}
              disabled={submitting}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-gray-900 transition-colors hover:bg-amber-400 disabled:opacity-60"
            >
              <CalendarCheck className="h-4 w-4" />
              {selectedDate
                ? `Request ${formatDate(selectedDate, locale)}`
                : latest?.status === "pending"
                  ? "Send another enquiry"
                  : "Request availability"}
            </button>
          ) : (
            <Link
              href="/login"
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-gray-900 hover:bg-amber-400"
            >
              Sign in to request availability
            </Link>
          )}

          <p className="mt-2 text-center text-3xs text-gray-500">
            Free to send — no booking or platform fees
          </p>

          <EventEnquiryModal
            open={enquiryOpen}
            listingTitle={listingTitle}
            spaces={spaces}
            defaultSpaceId={defaultSpaceId}
            defaultDate={selectedDate ?? undefined}
            submitting={submitting}
            error={error}
            onClose={() => setEnquiryOpen(false)}
            onSubmit={submit}
          />
        </>
      )}

      <ul className="mt-3.5 space-y-1 text-xs text-gray-700">
        {[
          "The host confirms your date first",
          "Contact details are shared after confirmation",
          "You then deal with the venue directly",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <span className="font-bold text-green-700">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
