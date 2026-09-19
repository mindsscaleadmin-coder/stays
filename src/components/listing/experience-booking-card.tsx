"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2, Users } from "lucide-react";
import { CheckAvailabilityLink } from "@/components/auth/check-availability-link";
import { computeExperienceQuote } from "@/lib/booking/compute-experience-quote";
import type { ExperienceSessionTemplate } from "@/lib/booking/experience-session-types";
import { formatStoredMoney, DISPLAY_DEFAULT_CURRENCY } from "@/lib/currency";
import { LAUNCH_TAX_LABEL } from "@/lib/tax/launch-market";

type SlotRow = {
  date: string;
  sessionKey: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  spotsLeft: number;
  priceMode: "per_person" | "per_group";
  price: number;
};

type Props = {
  listingId: string;
  maxGuests?: number;
  currency?: string;
  groupSizeMin?: number;
};

export function ExperienceBookingCard({
  listingId,
  maxGuests = 6,
  currency = DISPLAY_DEFAULT_CURRENCY,
  groupSizeMin = 1,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [sessionKey, setSessionKey] = useState("");
  const [guests, setGuests] = useState(Math.max(1, groupSizeMin));
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [sessions, setSessions] = useState<ExperienceSessionTemplate[]>([]);
  const [taxPct, setTaxPct] = useState(0);
  const [taxLabel, setTaxLabel] = useState(LAUNCH_TAX_LABEL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const to = new Date(`${date}T12:00:00Z`);
        to.setUTCDate(to.getUTCDate() + 14);
        const toIso = to.toISOString().slice(0, 10);
        const res = await fetch(
          `/api/listings/${encodeURIComponent(listingId)}/experience-slots?from=${date}&to=${toIso}`
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || "Could not load sessions");
        }
        const data = (await res.json()) as {
          slots: SlotRow[];
          sessions: ExperienceSessionTemplate[];
          taxPct?: number;
          taxLabel?: string;
        };
        if (cancelled) return;
        setSlots(data.slots ?? []);
        setSessions(data.sessions ?? []);
        if (data.taxPct != null) setTaxPct(data.taxPct);
        if (data.taxLabel) setTaxLabel(data.taxLabel);
        setSessionKey((prev) => prev || data.sessions?.[0]?.key || "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [listingId, date]);

  const daySlots = useMemo(
    () => slots.filter((s) => s.date === date),
    [slots, date]
  );

  const selected = daySlots.find((s) => s.sessionKey === sessionKey) ?? null;
  const sessionTemplate =
    sessions.find((s) => s.key === sessionKey) ??
    (selected
      ? {
          key: selected.sessionKey,
          label: selected.label,
          startTime: selected.startTime,
          endTime: selected.endTime,
          capacity: selected.capacity,
          priceMode: selected.priceMode,
          price: selected.price,
        }
      : null);

  const quote =
    sessionTemplate &&
    computeExperienceQuote({
      session: sessionTemplate,
      guestCount: guests,
      taxPct,
      taxLabel,
      currency,
    });

  const spotsLeft = selected?.spotsLeft ?? sessionTemplate?.capacity ?? 0;
  const canBook =
    Boolean(date && sessionKey && sessionTemplate) &&
    guests >= groupSizeMin &&
    guests <= Math.min(maxGuests, Math.max(guests, spotsLeft)) &&
    spotsLeft >= guests;

  const checkoutHref = `/booking/${listingId}/checkout?kind=experience&date=${date}&session=${encodeURIComponent(sessionKey)}&guests=${guests}`;

  const displaySlots =
    daySlots.length > 0
      ? daySlots
      : sessions.map((s) => ({
          date,
          sessionKey: s.key,
          label: s.label,
          startTime: s.startTime,
          endTime: s.endTime,
          capacity: s.capacity,
          bookedCount: 0,
          spotsLeft: s.capacity,
          priceMode: s.priceMode,
          price: s.price,
        }));

  return (
    <div id="booking-calculator" className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5 space-y-4 scroll-mt-24">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Experience</p>
        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
          <span className="text-3xl font-bold text-gray-900">
            {sessionTemplate
              ? formatStoredMoney(sessionTemplate.price, { storedCurrency: currency, currency })
              : "—"}
          </span>
          <span className="text-gray-400 text-sm">
            {sessionTemplate?.priceMode === "per_group" ? "/ group" : "/ person"}
          </span>
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1.5">
          <Calendar className="w-3.5 h-3.5" /> Date
        </span>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>

      <div>
        <span className="text-xs font-medium text-gray-600 mb-1.5 block">Session</span>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions…
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : displaySlots.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions configured yet.</p>
        ) : (
          <div className="space-y-2">
            {displaySlots.map((slot) => (
              <button
                key={slot.sessionKey}
                type="button"
                disabled={slot.spotsLeft <= 0}
                onClick={() => setSessionKey(slot.sessionKey)}
                className={`w-full text-start border rounded-xl px-3 py-2.5 transition-colors ${
                  sessionKey === slot.sessionKey
                    ? "border-green-600 bg-green-50 ring-1 ring-green-200"
                    : "border-gray-200 hover:border-green-300"
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900">{slot.label}</span>
                  <span className="text-xs text-gray-500">
                    {slot.spotsLeft} spot{slot.spotsLeft === 1 ? "" : "s"} left
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {slot.startTime} – {slot.endTime} ·{" "}
                  {formatStoredMoney(slot.price, { storedCurrency: currency, currency })}
                  {slot.priceMode === "per_group" ? "/group" : "/person"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1.5">
          <Users className="w-3.5 h-3.5" /> Guests
        </span>
        <input
          type="number"
          min={groupSizeMin}
          max={Math.max(groupSizeMin, Math.min(maxGuests, spotsLeft || maxGuests))}
          value={guests}
          onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>

      {quote ? (
        <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
          <p className="text-[11px] text-gray-500">All prices inclusive</p>
          {quote.lines.map((line) => (
            <div key={line.label} className="flex justify-between gap-2 text-gray-600">
              <span>{line.label}</span>
              <span>{formatStoredMoney(line.amount, { storedCurrency: currency, currency })}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2 font-semibold text-gray-900 pt-1">
            <span>Total</span>
            <span>{formatStoredMoney(quote.total, { storedCurrency: currency, currency })}</span>
          </div>
        </div>
      ) : null}

      <CheckAvailabilityLink
        href={checkoutHref}
        className={`w-full block font-bold py-3.5 rounded-xl transition-colors text-center text-sm ${
          canBook
            ? "bg-green-700 hover:bg-green-800 text-white"
            : "bg-gray-200 text-gray-500 pointer-events-none"
        }`}
      >
        Reserve session
      </CheckAvailabilityLink>

      <p className="text-[11px] text-gray-400 text-center">
        Instant confirmation when spots are available.
      </p>
    </div>
  );
}
