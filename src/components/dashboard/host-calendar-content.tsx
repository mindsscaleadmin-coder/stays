"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import { catalogListingsForHost } from "@/lib/listings/catalog-listing-hosts";
import { useHostAvailability } from "@/lib/host/use-host-availability";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import {
  calendarMonthLabel,
  daysInMonthGrid,
  expandSeasonalClosedDates,
  formatShortDate,
  getSeasonalPeriodForDate,
  isSeasonallyClosed,
} from "@/lib/host/host-availability-utils";
import {
  downloadIcalFile,
  exportBlockedDatesIcal,
  importBlockedDatesFromIcal,
} from "@/lib/host/ical-utils";
import { cn } from "@/lib/utils";
import { usePlatformConfig } from "@/lib/admin/use-admin-platform-config";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HostCalendarContent() {
  const { user } = useAuth();
  const platformConfig = usePlatformConfig();
  const calendarSyncEnabled = platformConfig.features.hostFeatures.calendarSync;
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, ready: listingsReady } = useListingSubmissions();
  const submissions = useMemo(
    () => filterHostListings(all, hostId ?? "", hostName),
    [all, hostId, hostName]
  );
  const { bookings } = useHostBookings();

  const listingOptions = useMemo(() => {
    const catalog = hostId
      ? catalogListingsForHost(hostId).map((c) => ({ id: c.listingId, title: c.title }))
      : [];
    const base = submissions.map((l) => ({ id: l.id, title: l.title }));
    const fromBookings = bookings
      .filter((b) => b.listingId)
      .map((b) => ({ id: b.listingId as string, title: b.property || b.listingId || "Listing" }));
    const seen = new Set<string>();
    return [...catalog, ...base, ...fromBookings].filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  }, [submissions, hostId, bookings]);

  const [listingId, setListingId] = useState(listingOptions[0]?.id ?? "");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [message, setMessage] = useState("");
  const [newSeason, setNewSeason] = useState({
    name: "",
    startDate: "",
    endDate: "",
    closed: true,
    note: "",
  });
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!listingOptions.some((l) => l.id === listingId) && listingOptions[0]) {
      setListingId(listingOptions[0].id);
    }
  }, [listingId, listingOptions]);

  const {
    settings,
    occupiedDates,
    ready,
    toggleDate,
    updateSettings,
    addSeason,
    removeSeason,
    importIcalDates,
    addIcalFeed,
    removeIcalFeed,
    syncIcalFeeds,
  } = useHostAvailability(listingId);
  const [feedName, setFeedName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [minStayDraft, setMinStayDraft] = useState(2);
  const [noticeDraft, setNoticeDraft] = useState(1);
  const [origin, setOrigin] = useState(
    () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const exportUrl =
    origin && listingId && settings?.icalToken
      ? `${origin}/api/listings/${listingId}/calendar?token=${settings.icalToken}`
      : "";

  const selectedTitle =
    listingOptions.find((l) => l.id === listingId)?.title ?? "Listing";

  const { bookedDates, pendingDates } = useMemo(() => {
    const booked = new Set<string>(occupiedDates);
    const pending = new Set<string>();
    for (const b of bookings) {
      if (b.status !== "confirmed" && b.status !== "pending") continue;
      const matchesListing =
        (b.listingId && b.listingId === listingId) ||
        (!b.listingId && b.property === selectedTitle);
      if (!matchesListing) continue;
      const start = new Date(`${b.checkIn}T12:00:00`);
      const end = new Date(`${b.checkOut}T12:00:00`);
      const target = b.status === "pending" ? pending : booked;
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        target.add(d.toISOString().slice(0, 10));
      }
    }
    return { bookedDates: booked, pendingDates: pending };
  }, [bookings, listingId, selectedTitle, occupiedDates]);

  useEffect(() => {
    if (!settings) return;
    setMinStayDraft(settings.minStayNights);
    setNoticeDraft(settings.advanceNoticeDays);
  }, [settings]);

  const grid = useMemo(
    () => daysInMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2800);
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  async function handleDayClick(date: string) {
    if (!settings) return;
    if (bookedDates.has(date) || pendingDates.has(date)) {
      flash("Booked nights can’t be changed here.");
      return;
    }
    if ((settings.icalImportedDates ?? []).includes(date)) {
      flash("This date is busy on a connected calendar.");
      return;
    }
    const seasonClosed = isSeasonallyClosed(date, settings.seasonalPeriods);
    const wasBlocked = settings.blockedDates.includes(date);
    try {
      await toggleDate(date);
      if (wasBlocked) {
        flash(seasonClosed ? "Manual block removed (still seasonally closed)." : "Date opened.");
      } else {
        flash(seasonClosed ? "Date blocked on top of seasonal closure." : "Date blocked.");
      }
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not update that date.");
    }
  }

  function handleExportIcal() {
    if (!settings) return;
    const dates = Array.from(
      new Set([
        ...settings.blockedDates,
        ...(settings.icalImportedDates ?? []),
        ...Array.from(bookedDates),
        ...expandSeasonalClosedDates(settings.seasonalPeriods),
      ])
    ).sort();
    const ics = exportBlockedDatesIcal(selectedTitle, dates);
    downloadIcalFile(`${listingId}-availability.ics`, ics);
    flash("iCal file exported.");
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const dates = importBlockedDatesFromIcal(text);
      if (dates.length === 0) {
        flash("No blocked dates found in that file.");
        return;
      }
      await importIcalDates(dates);
      flash(`Imported ${dates.length} blocked date(s) from iCal.`);
    } catch {
      flash("Could not read the iCal file.");
    }
  }

  async function handleAddSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!newSeason.name.trim() || !newSeason.startDate || !newSeason.endDate) return;
    try {
      await addSeason({
        name: newSeason.name.trim(),
        startDate: newSeason.startDate,
        endDate: newSeason.endDate,
        closed: newSeason.closed,
        note: newSeason.note.trim() || undefined,
      });
      setNewSeason({ name: "", startDate: "", endDate: "", closed: true, note: "" });
      flash("Seasonal period added.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not add that period.");
    }
  }

  async function commitRules() {
    try {
      await updateSettings({
        minStayNights: Math.max(1, minStayDraft || 1),
        advanceNoticeDays: Math.max(0, noticeDraft || 0),
      });
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not save booking rules.");
    }
  }

  if (!listingsReady || !ready) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  if (listingOptions.length === 0) {
    return (
      <HostDashboardShell>
        <div className="rounded-2xl border bg-white p-8 text-center space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">No listings yet</h2>
          <p className="text-sm text-gray-500">
            Add a listing first, then you can block dates and connect Airbnb or Booking.com
            calendars.
          </p>
        </div>
      </HostDashboardShell>
    );
  }

  if (!settings) {
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
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Calendar & Availability</h2>
          <p className="text-gray-500 text-sm mt-1">
            Block dates, manage seasonal closures, sync calendars, and set booking rules.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl border p-4 sm:p-5">
          <label className="block max-w-md">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
              Property
            </span>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {listingOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="bg-white rounded-2xl border p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Visual calendar</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
                {calendarMonthLabel(viewYear, viewMonth)}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Blocked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Seasonal closure
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-violet-100 border border-violet-300" /> Pending
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" /> Channel
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> Open
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[10px] font-semibold text-gray-400 py-1">
                {d}
              </div>
            ))}
            {grid.map((date, i) => {
              if (!date) {
                return <div key={`pad-${i}`} className="aspect-square" />;
              }
              const blocked = settings.blockedDates.includes(date);
              const imported = (settings.icalImportedDates ?? []).includes(date);
              const seasonal = getSeasonalPeriodForDate(date, settings.seasonalPeriods);
              const seasonClosed = isSeasonallyClosed(date, settings.seasonalPeriods);
              const booked = bookedDates.has(date);
              const pending = pendingDates.has(date);
              const occupied = booked || pending || imported;
              const today = new Date().toISOString().slice(0, 10) === date;
              const interactive = !occupied;

              return (
                <button
                  key={date}
                  type="button"
                  disabled={!interactive}
                  onClick={() => handleDayClick(date)}
                  title={
                    booked
                      ? "Booked — cannot change"
                      : pending
                        ? "Pending request — cannot change"
                      : imported
                        ? "Busy on a connected calendar — cannot change"
                      : seasonal
                        ? `${seasonal.name}${seasonClosed ? " (closed)" : ""} — click to ${blocked ? "unblock" : "block"}`
                        : blocked
                          ? "Click to open"
                          : "Click to block"
                  }
                  className={cn(
                    "aspect-square rounded-lg text-xs font-medium transition-all border",
                    interactive && "cursor-pointer hover:scale-[1.04] hover:shadow-sm active:scale-95",
                    !interactive && "cursor-not-allowed opacity-80",
                    blocked && "bg-red-100 border-red-300 text-red-900",
                    !blocked && seasonClosed && "bg-amber-100 border-amber-300 text-amber-900",
                    !blocked && !seasonClosed && booked && "bg-blue-100 border-blue-300 text-blue-900",
                    !blocked && !seasonClosed && !booked && pending && "bg-violet-100 border-violet-300 text-violet-900",
                    !blocked &&
                      !seasonClosed &&
                      !booked &&
                      !pending &&
                      imported &&
                      "bg-slate-100 border-slate-300 text-slate-800",
                    !blocked &&
                      !seasonClosed &&
                      !occupied &&
                      "bg-green-50 border-green-200 text-gray-800 hover:bg-green-100 hover:border-green-400",
                    today && "ring-2 ring-green-600 ring-offset-1"
                  )}
                >
                  {Number(date.slice(8))}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            Click an open date to block it, click again to reopen. Booked nights and dates from
            connected calendars stay locked.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Channel manager</h3>
            {!calendarSyncEnabled ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                External calendar sync is disabled by platform admin.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Paste this export URL into Airbnb or Booking.com so those sites see Farm Stays
                  bookings. Add their calendar URLs here so their bookings block this calendar.
                </p>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    Export URL (give this to other platforms)
                  </span>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={exportUrl || "Preparing export URL…"}
                      className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50"
                    />
                    <button
                      type="button"
                      disabled={!exportUrl}
                      onClick={() => {
                        void navigator.clipboard.writeText(exportUrl).then(() =>
                          flash("Export URL copied.")
                        );
                      }}
                      className="inline-flex items-center gap-1.5 text-sm border border-gray-200 hover:border-green-400 disabled:opacity-50 px-3 py-2 rounded-xl font-semibold"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                </label>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!feedUrl.trim()) return;
                    try {
                      const parsed = new URL(feedUrl.trim());
                      if (parsed.protocol !== "https:") throw new Error("https");
                    } catch {
                      flash("Enter an https:// calendar URL from Airbnb or Booking.com.");
                      return;
                    }
                    void addIcalFeed({ name: feedName, url: feedUrl.trim() })
                      .then(() => {
                        setFeedName("");
                        setFeedUrl("");
                        flash("External calendar added. Click Sync now to pull busy dates.");
                      })
                      .catch((err: unknown) => {
                        flash(err instanceof Error ? err.message : "Could not add that calendar.");
                      });
                  }}
                  className="space-y-2"
                >
                  <span className="text-xs font-medium text-gray-600 block">
                    Import URL (from Airbnb / Booking.com)
                  </span>
                  <input
                    value={feedName}
                    onChange={(e) => setFeedName(e.target.value)}
                    placeholder="Airbnb"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 text-sm border border-gray-200 hover:border-green-400 text-gray-700 px-4 py-2 rounded-xl font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Add calendar
                  </button>
                </form>

                {(settings.icalFeeds ?? []).length > 0 && (
                  <ul className="space-y-2">
                    {(settings.icalFeeds ?? []).map((feed) => (
                      <li
                        key={feed.id}
                        className="flex items-start justify-between gap-2 text-sm border border-gray-100 rounded-xl px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{feed.name}</p>
                          <p className="text-xs text-gray-400 truncate">{feed.url}</p>
                          {feed.lastError && (
                            <p className="text-xs text-red-600 mt-1">{feed.lastError}</p>
                          )}
                          {feed.lastSyncedAt && !feed.lastError && (
                            <p className="text-xs text-gray-400 mt-1">
                              Synced {new Date(feed.lastSyncedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void removeIcalFeed(feed.id).catch((err: unknown) => {
                              flash(err instanceof Error ? err.message : "Could not remove calendar.");
                            });
                          }}
                          className="text-gray-400 hover:text-red-600 shrink-0"
                          aria-label={`Remove ${feed.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={syncing || (settings.icalFeeds ?? []).length === 0}
                    onClick={() => {
                      setSyncing(true);
                      void syncIcalFeeds()
                        .then((saved) => {
                          const n = saved?.icalImportedDates?.length ?? 0;
                          flash(`Synced ${n} busy date(s) from external calendars.`);
                        })
                        .catch((err: unknown) => {
                          flash(err instanceof Error ? err.message : "Sync failed.");
                        })
                        .finally(() => setSyncing(false));
                    }}
                    className="inline-flex items-center gap-1.5 text-sm bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    Sync now
                  </button>
                  <button
                    type="button"
                    onClick={handleExportIcal}
                    className="inline-flex items-center gap-1.5 text-sm border border-gray-200 hover:border-green-400 text-gray-700 px-4 py-2 rounded-xl font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Download .ics
                  </button>
                  <input
                    ref={importRef}
                    type="file"
                    accept=".ics,text/calendar"
                    className="hidden"
                    onChange={(e) => {
                      void handleImportFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => importRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-sm border border-gray-200 hover:border-green-400 text-gray-700 px-4 py-2 rounded-xl font-semibold"
                  >
                    <Upload className="w-4 h-4" />
                    Import file
                  </button>
                </div>
                {settings.lastIcalImportAt && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Last import: {new Date(settings.lastIcalImportAt).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </section>

          <section className="bg-white rounded-2xl border p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Booking rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">
                  Minimum stay (nights)
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={minStayDraft}
                  onChange={(e) => setMinStayDraft(Math.max(1, Number(e.target.value) || 1))}
                  onBlur={() => void commitRules()}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">
                  Advance notice (days)
                </span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={noticeDraft}
                  onChange={(e) => setNoticeDraft(Math.max(0, Number(e.target.value) || 0))}
                  onBlur={() => void commitRules()}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
            </div>
            <p className="text-xs text-gray-400">
              Guests must book at least {settings.minStayNights} night
              {settings.minStayNights === 1 ? "" : "s"} and {settings.advanceNoticeDays} day
              {settings.advanceNoticeDays === 1 ? "" : "s"} before check-in.
            </p>
          </section>
        </div>

        <section className="bg-white rounded-2xl border p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Seasonal availability</h3>
          <p className="text-xs text-gray-500">
            Harvest seasons, monsoon closures, and other recurring windows. Periods repeat each year
            by month and day.
          </p>

          {settings.seasonalPeriods.length === 0 ? (
            <p className="text-sm text-gray-400">No seasonal periods configured yet.</p>
          ) : (
            <ul className="space-y-2">
              {settings.seasonalPeriods.map((period) => (
                <li
                  key={period.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{period.name}</span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          period.closed
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-700"
                        )}
                      >
                        {period.closed ? "Closed" : "Open / special"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatShortDate(period.startDate)} → {formatShortDate(period.endDate)}
                      {period.note ? ` · ${period.note}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void removeSeason(period.id)
                        .then(() => flash("Seasonal period removed."))
                        .catch((err: unknown) => {
                          flash(err instanceof Error ? err.message : "Could not remove period.");
                        });
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    aria-label={`Remove ${period.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddSeason} className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Add seasonal period
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                value={newSeason.name}
                onChange={(e) => setNewSeason((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Monsoon closure"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="date"
                value={newSeason.startDate}
                onChange={(e) => setNewSeason((p) => ({ ...p, startDate: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="date"
                value={newSeason.endDate}
                onChange={(e) => setNewSeason((p) => ({ ...p, endDate: e.target.value }))}
                required
                min={newSeason.startDate || undefined}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 px-1">
                <input
                  type="checkbox"
                  checked={newSeason.closed}
                  onChange={(e) => setNewSeason((p) => ({ ...p, closed: e.target.checked }))}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Closed during period
              </label>
            </div>
            <input
              value={newSeason.note}
              onChange={(e) => setNewSeason((p) => ({ ...p, note: e.target.value }))}
              placeholder="Optional note for guests"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add period
            </button>
          </form>
        </section>
      </div>
    </HostDashboardShell>
  );
}
