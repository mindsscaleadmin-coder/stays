"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import {
  DoorClosed,
  DoorOpen,
  Loader2,
  UserX,
  Users,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { OpsListBadges } from "@/components/dashboard/booking-ops/ops-list-badges";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import { groupDailyOps } from "@/lib/host/host-daily-ops";
import { hostBookingDetailPath } from "@/lib/host/host-ops-adapter";
import {
  arrivalStatusLabel,
  countNeedsAction,
  departureStatusLabel,
  filterStayCheckInOutBookings,
  formatAutomationSummary,
  isBookingPaid,
} from "@/lib/host/host-check-in-out-utils";
import { useHostOperationalSettings } from "@/lib/host/use-host-operational-settings";
import { HostOperationalSettingsPanel } from "@/components/dashboard/host-operational-settings-panel";
import { formatBookingDate } from "@/lib/booking/display";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { cn } from "@/lib/utils";

function todayHeading() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "pending" | "success" | "warning" | "muted";
}) {
  const styles = {
    pending: "bg-amber-50 text-amber-800",
    success: "bg-green-50 text-green-800",
    warning: "bg-orange-50 text-orange-800",
    muted: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={cn(
        "text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        styles[tone]
      )}
    >
      {label}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  tone = "green",
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "green" | "gray" | "orange";
  disabled?: boolean;
}) {
  const tones = {
    green: "bg-green-700 hover:bg-green-800 text-white",
    gray: "bg-gray-800 hover:bg-gray-900 text-white",
    orange: "border border-orange-200 text-orange-800 hover:bg-orange-50",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50",
        tones[tone]
      )}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border px-4 py-3 min-w-[120px]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p> : null}
    </div>
  );
}

function GuestRow({
  booking,
  meta,
  status,
  actions,
}: {
  booking: HostBookingRecord;
  meta: string;
  status: { label: string; tone: "pending" | "success" | "warning" | "muted" };
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-100 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={hostBookingDetailPath(booking)}
            className="text-sm font-semibold text-gray-900 hover:text-green-800"
          >
            {booking.guest}
          </Link>
          <OpsListBadges booking={booking} />
          <StatusPill label={status.label} tone={status.tone} />
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{meta}</p>
        {booking.property ? (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{booking.property}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

function OpsSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span className="text-xs font-semibold text-gray-400 tabular-nums">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-gray-500 py-2">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

export function HostCheckInOutContent() {
  const { bookings, ready, checkIn, checkOut, markNoShow } = useHostBookings();
  const {
    settings: operationalSettings,
    timezoneMeta,
    ready: settingsReady,
  } = useHostOperationalSettings();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState("");

  const stayBookings = useMemo(
    () => filterStayCheckInOutBookings(bookings),
    [bookings]
  );
  const ops = useMemo(() => groupDailyOps(stayBookings), [stayBookings]);
  const needsAction = useMemo(
    () => countNeedsAction(ops.arrivals, ops.departures),
    [ops.arrivals, ops.departures]
  );

  async function run(id: string, work: () => Promise<unknown>, ok: string) {
    setBusyId(id);
    try {
      await work();
      setFlash(ok);
      window.setTimeout(() => setFlash(""), 2500);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Could not update booking.");
      window.setTimeout(() => setFlash(""), 3000);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
              Daily operations
            </p>
            <h1 className="text-2xl font-bold text-gray-900 font-display">Check-in / Check-out</h1>
            <p className="text-sm text-gray-500 mt-1">{todayHeading()}</p>
            {settingsReady ? (
              <p className="text-xs text-gray-400 mt-1">
                {formatAutomationSummary(operationalSettings, timezoneMeta.countryName)}
              </p>
            ) : null}
          </div>
          {flash ? (
            <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
              {flash}
            </p>
          ) : null}
        </div>

        {!ready ? (
          <div className="bg-white rounded-2xl border p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            <HostOperationalSettingsPanel />

            <div className="flex flex-wrap gap-3">
              <SummaryCard
                label="Arrivals"
                value={ops.arrivals.length}
                hint={ops.arrivals.length ? "Today" : undefined}
              />
              <SummaryCard label="Staying" value={ops.onProperty.length} />
              <SummaryCard
                label="Departures"
                value={ops.departures.length}
                hint={ops.departures.length ? "Today" : undefined}
              />
              <SummaryCard
                label="Needs action"
                value={needsAction}
                hint={needsAction ? "Tap a button below" : "All caught up"}
              />
            </div>

            {ops.arrivals.length + ops.onProperty.length + ops.departures.length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-900">No guests on the property today</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Arrivals and departures for paid stays will appear here. Use Bookings or Calendar
                  to see what&apos;s coming up.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Link
                    href="/host/bookings"
                    className="text-xs font-semibold bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800"
                  >
                    View bookings
                  </Link>
                  <Link
                    href="/host/calendar"
                    className="text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    Open calendar
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <OpsSection
                  title="Arrivals today"
                  count={ops.arrivals.length}
                  empty="No one arriving today."
                >
                  {ops.arrivals.map((booking) => {
                    const status = arrivalStatusLabel(booking);
                    const busy = busyId === booking.id;
                    const canCheckIn =
                      !booking.noShow &&
                      booking.checkInStatus === "pending" &&
                      isBookingPaid(booking);

                    return (
                      <GuestRow
                        key={booking.id}
                        booking={booking}
                        meta={`Arrives today · ${booking.roomType}`}
                        status={status}
                        actions={
                          <>
                            {canCheckIn ? (
                              <ActionButton
                                disabled={busy}
                                onClick={() =>
                                  run(booking.id, () => checkIn(booking.id), "Guest checked in")
                                }
                              >
                                <DoorOpen className="w-3.5 h-3.5" />
                                Check in now
                              </ActionButton>
                            ) : null}
                            {booking.checkInStatus === "pending" && !booking.noShow ? (
                              <ActionButton
                                tone="orange"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    booking.id,
                                    () => markNoShow(booking.id, true),
                                    "Marked as no-show"
                                  )
                                }
                              >
                                <UserX className="w-3.5 h-3.5" />
                                No-show
                              </ActionButton>
                            ) : null}
                            {booking.noShow ? (
                              <ActionButton
                                tone="gray"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    booking.id,
                                    () => markNoShow(booking.id, false),
                                    "No-show cleared"
                                  )
                                }
                              >
                                Clear no-show
                              </ActionButton>
                            ) : null}
                          </>
                        }
                      />
                    );
                  })}
                </OpsSection>

                <OpsSection
                  title="Staying now"
                  count={ops.onProperty.length}
                  empty="No guests mid-stay today."
                >
                  {ops.onProperty.map((booking) => (
                    <GuestRow
                      key={booking.id}
                      booking={booking}
                      meta={`Until ${formatBookingDate(booking.checkOut)} · ${booking.roomType}`}
                      status={arrivalStatusLabel(booking)}
                    />
                  ))}
                </OpsSection>

                <OpsSection
                  title="Departures today"
                  count={ops.departures.length}
                  empty="No one leaving today."
                >
                  {ops.departures.map((booking) => {
                    const status = departureStatusLabel(booking);
                    const busy = busyId === booking.id;
                    const canCheckOut =
                      booking.checkInStatus !== "checked_out" && booking.status !== "completed";

                    return (
                      <GuestRow
                        key={booking.id}
                        booking={booking}
                        meta="Leaves today"
                        status={status}
                        actions={
                          canCheckOut ? (
                            <ActionButton
                              tone="gray"
                              disabled={busy}
                              onClick={() =>
                                run(booking.id, () => checkOut(booking.id), "Guest checked out")
                              }
                            >
                              <DoorClosed className="w-3.5 h-3.5" />
                              Check out now
                            </ActionButton>
                          ) : null
                        }
                      />
                    );
                  })}
                </OpsSection>
              </div>
            )}
          </>
        )}
      </div>
    </HostDashboardShell>
  );
}
