"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CakeSlice,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Gem,
  Gift,
  PartyPopper,
  ShieldCheck,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import type { EventSpace } from "@/components/listing/event-listing-detail-content";

export interface EventEnquiryDraft {
  occasion: string;
  guestCount: number;
  eventDate?: string;
  dateFlexible: boolean;
  partyType: string;
  spaceId?: string;
  spaceName?: string;
  guestPhone?: string;
  message?: string;
}

const OCCASIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Wedding", icon: Gem },
  { label: "Birthday", icon: CakeSlice },
  { label: "Milestone", icon: Trophy },
  { label: "Party", icon: PartyPopper },
  { label: "Shower", icon: Gift },
  { label: "Business event", icon: BriefcaseBusiness },
];

const PARTY_TYPES = [
  "Wedding ceremony",
  "Wedding reception",
  "Birthday party",
  "Reunion",
  "Banquet",
  "Holiday party",
  "Cocktail reception",
  "Conference",
  "Corporate dinner",
  "Product launch",
  "Concert",
  "Other",
];

const GUEST_PRESETS = [20, 30, 40, 50, 75, 100, 150, 200];

const STEPS = [
  { title: "Occasion", hint: "What you're planning" },
  { title: "Event details", hint: "Guests, date, space" },
  { title: "Contact", hint: "How the host replies" },
];

const FIELD =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-green-700 focus:ring-4 focus:ring-green-700/10";

/** Pill used for guest presets, the flexible-date toggle and party types. */
function choiceClass(selected: boolean) {
  return selected
    ? "border-green-800 bg-green-800 text-white shadow-sm"
    : "border-gray-200 bg-white text-gray-800 hover:border-green-700 hover:text-green-900";
}

export function EventEnquiryModal({
  open,
  listingTitle,
  spaces,
  defaultSpaceId,
  defaultDate,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  listingTitle: string;
  spaces: EventSpace[];
  defaultSpaceId: string;
  /** Pre-selected from the availability calendar on the listing page. */
  defaultDate?: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (draft: EventEnquiryDraft) => Promise<boolean>;
}) {
  const [step, setStep] = useState(1);
  const [occasion, setOccasion] = useState("");
  const [guestPreset, setGuestPreset] = useState<number | "other" | null>(null);
  const [customGuests, setCustomGuests] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [dateFlexible, setDateFlexible] = useState(false);
  const [partyType, setPartyType] = useState("");
  const [spaceId, setSpaceId] = useState(defaultSpaceId);
  const [guestPhone, setGuestPhone] = useState("");
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const maxCapacity = useMemo(
    () => Math.max(0, ...spaces.map((space) => space.capacity || 0)),
    [spaces]
  );
  const guestCount =
    guestPreset === "other" ? Number(customGuests) : typeof guestPreset === "number" ? guestPreset : 0;
  const selectedSpace =
    spaces.find((space) => (space.id ?? space.name) === spaceId) ?? spaces[0] ?? null;
  const dateFromCalendar = Boolean(defaultDate) && eventDate === defaultDate;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  /** Adopt the space and the calendar date every time the sheet is opened. */
  useEffect(() => {
    if (!open) return;
    setSpaceId(defaultSpaceId);
    if (defaultDate) {
      setEventDate(defaultDate);
      setDateFlexible(false);
    }
  }, [defaultSpaceId, defaultDate, open]);

  if (!open) return null;

  function next() {
    setLocalError(null);
    if (step === 1 && !occasion) {
      setLocalError("Choose an occasion to continue.");
      return;
    }
    if (step === 2) {
      if (!guestCount || guestCount < 1) {
        setLocalError("Choose the expected guest count.");
        return;
      }
      if (!dateFlexible && !eventDate) {
        setLocalError("Choose a preferred date or mark it as flexible.");
        return;
      }
      if (!partyType) {
        setLocalError("Choose the party type.");
        return;
      }
    }
    setStep((current) => Math.min(3, current + 1));
  }

  async function finish() {
    setLocalError(null);
    const sent = await onSubmit({
      occasion,
      guestCount,
      eventDate: dateFlexible ? undefined : eventDate,
      dateFlexible,
      partyType,
      spaceId: selectedSpace?.id,
      spaceName: selectedSpace?.name,
      guestPhone: guestPhone.trim() || undefined,
      message: message.trim() || undefined,
    });
    if (sent) {
      setStep(1);
      setOccasion("");
      setGuestPreset(null);
      setCustomGuests("");
      setEventDate("");
      setDateFlexible(false);
      setPartyType("");
      setGuestPhone("");
      setMessage("");
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-950/60 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-enquiry-title"
        className="flex max-h-[94dvh] w-full max-w-[880px] overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[86vh] sm:rounded-2xl"
      >
        {/* Context rail — keeps the venue and the remaining steps in view. */}
        <aside className="hidden w-[268px] shrink-0 flex-col justify-between bg-green-900 p-7 lg:flex">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
              Venue enquiry
            </p>
            <p className="mt-2 font-display text-xl font-bold leading-snug text-white">
              {listingTitle}
            </p>

            <ol className="mt-8 space-y-1">
              {STEPS.map((item, index) => {
                const position = index + 1;
                const active = position === step;
                const done = position < step;
                return (
                  <li
                    key={item.title}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      active ? "bg-white/10" : ""
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        done
                          ? "bg-amber-400 text-green-950"
                          : active
                            ? "bg-white text-green-900"
                            : "border border-white/25 text-white/60"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : position}
                    </span>
                    <span>
                      <span
                        className={`block text-[13px] font-semibold ${
                          active || done ? "text-white" : "text-white/60"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="block text-[11px] text-white/45">{item.hint}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <ul className="space-y-2 border-t border-white/10 pt-5 text-[11px] leading-4 text-white/70">
            {[
              "The host confirms your date first",
              "Contact details shared after confirmation",
              "Free to send — no platform fees",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-amber-300" />
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-gray-100 px-5 pb-3.5 pt-4 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-700 lg:hidden">
                  Venue enquiry
                </p>
                <p className="truncate font-display text-[15px] font-bold text-gray-950 lg:hidden">
                  {listingTitle}
                </p>
                <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 lg:block">
                  Step {step} of 3 · {STEPS[step - 1].title}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close enquiry"
                className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex gap-1.5" aria-hidden>
              {STEPS.map((item, index) => (
                <span
                  key={item.title}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index + 1 <= step ? "bg-green-800" : "bg-gray-100"
                  }`}
                />
              ))}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {step === 1 && (
              <>
                <h2
                  id="event-enquiry-title"
                  className="font-display text-[22px] font-bold tracking-tight text-gray-950"
                >
                  What’s the occasion?
                </h2>
                <p className="mt-1.5 text-[13px] text-gray-500">
                  This tells the host what kind of event to plan around.
                </p>

                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {OCCASIONS.map(({ label, icon: Icon }) => {
                    const selected = occasion === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setOccasion(label);
                          setLocalError(null);
                        }}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                          selected
                            ? "border-green-800 bg-green-50/70 ring-1 ring-green-800"
                            : "border-gray-200 bg-white hover:border-green-700 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            selected ? "bg-green-800 text-white" : "bg-gray-100 text-green-800"
                          }`}
                        >
                          <Icon className="h-5 w-5 stroke-[1.6]" />
                        </span>
                        <span className="flex-1 text-sm font-semibold text-gray-900">{label}</span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-green-800" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2
                  id="event-enquiry-title"
                  className="font-display text-[22px] font-bold tracking-tight text-gray-950"
                >
                  Tell us the details
                </h2>
                <p className="mt-1.5 text-[13px] text-gray-500">
                  Enough for the host to check the right space on your date.
                </p>

                <div className="mt-5 space-y-5">
                  <fieldset>
                    <div className="flex items-baseline justify-between gap-3">
                      <legend className="text-[13px] font-bold text-gray-900">Guest count</legend>
                      {maxCapacity > 0 && (
                        <span className="text-[11px] text-gray-500">
                          venue holds up to {maxCapacity}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {GUEST_PRESETS.filter((count) => !maxCapacity || count <= maxCapacity).map(
                        (count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => {
                              setGuestPreset(count);
                              setLocalError(null);
                            }}
                            className={`min-w-[54px] rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${choiceClass(
                              guestPreset === count
                            )}`}
                          >
                            {count}
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => setGuestPreset("other")}
                        className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors ${choiceClass(
                          guestPreset === "other"
                        )}`}
                      >
                        Other
                      </button>
                    </div>
                    {guestPreset === "other" && (
                      <input
                        type="number"
                        min={1}
                        max={maxCapacity || 5000}
                        autoFocus
                        value={customGuests}
                        onChange={(event) => setCustomGuests(event.target.value)}
                        placeholder="Enter guest count"
                        className={`mt-2.5 ${FIELD}`}
                      />
                    )}
                  </fieldset>

                  <fieldset>
                    <legend className="text-[13px] font-bold text-gray-900">Preferred date</legend>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <label className="relative block">
                        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-700" />
                        <input
                          type="date"
                          disabled={dateFlexible}
                          value={eventDate}
                          onChange={(event) => {
                            setEventDate(event.target.value);
                            setLocalError(null);
                          }}
                          className={`${FIELD} pr-10 disabled:bg-gray-50 disabled:text-gray-400`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setDateFlexible((value) => !value);
                          setLocalError(null);
                        }}
                        className={`rounded-lg border px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${choiceClass(
                          dateFlexible
                        )}`}
                      >
                        My date is flexible
                      </button>
                    </div>
                    {dateFromCalendar && !dateFlexible && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-green-800">
                        <Check className="h-3.5 w-3.5" />
                        Taken from the availability calendar — change it here if you need to.
                      </p>
                    )}
                  </fieldset>

                  <label className="block">
                    <span className="text-[13px] font-bold text-gray-900">Party type</span>
                    <select
                      value={partyType}
                      onChange={(event) => {
                        setPartyType(event.target.value);
                        setLocalError(null);
                      }}
                      className={`mt-2.5 ${FIELD}`}
                    >
                      <option value="">Choose one</option>
                      {PARTY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

                  {spaces.length > 1 && (
                    <label className="block">
                      <span className="text-[13px] font-bold text-gray-900">Preferred space</span>
                      <select
                        value={spaceId}
                        onChange={(event) => setSpaceId(event.target.value)}
                        className={`mt-2.5 ${FIELD}`}
                      >
                        {spaces.map((space) => (
                          <option key={space.id ?? space.name} value={space.id ?? space.name}>
                            {space.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2
                  id="event-enquiry-title"
                  className="font-display text-[22px] font-bold tracking-tight text-gray-950"
                >
                  How should the host reach you?
                </h2>
                <p className="mt-1.5 text-[13px] text-gray-500">
                  Review your request, then add anything that helps them answer.
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  {[
                    { label: "Occasion", value: occasion },
                    { label: "Guests", value: String(guestCount) },
                    { label: "Date", value: dateFlexible ? "Flexible" : eventDate },
                    { label: "Party type", value: partyType },
                    ...(selectedSpace ? [{ label: "Space", value: selectedSpace.name }] : []),
                  ].map((row) => (
                    <div key={row.label}>
                      <dt className="text-[11px] text-gray-500">{row.label}</dt>
                      <dd className="mt-0.5 text-[13px] font-bold text-gray-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <label className="mt-4 block">
                  <span className="text-[13px] font-bold text-gray-900">
                    Phone number <span className="font-normal text-gray-400">(optional)</span>
                  </span>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    placeholder="+971 50 123 4567"
                    className={`mt-2.5 ${FIELD}`}
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-[13px] font-bold text-gray-900">
                    Message to the host{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </span>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Timings, catering, decoration, accessibility — anything you need."
                    className={`mt-2.5 resize-y ${FIELD}`}
                  />
                </label>

                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-5 text-amber-900">
                  The host confirms availability first. Their WhatsApp details stay hidden until
                  they confirm your date.
                </p>
              </>
            )}

            {(localError || error) && (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700"
              >
                {localError || error}
              </p>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 px-5 py-3.5 sm:px-7">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setStep((current) => Math.max(1, current - 1));
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                Step {step} of 3
              </span>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={() => (step < 3 ? next() : void finish())}
              className="inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-xl bg-green-800 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-green-900 disabled:opacity-60"
            >
              {step < 3 ? (
                <>
                  Continue <ChevronRight className="h-4 w-4" />
                </>
              ) : submitting ? (
                "Sending…"
              ) : (
                "Send request"
              )}
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
