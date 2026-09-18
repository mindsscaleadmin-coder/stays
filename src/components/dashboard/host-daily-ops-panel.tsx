"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import {
  CalendarDays,
  DoorClosed,
  DoorOpen,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import { useHostSubmissions } from "@/lib/listings/use-listing-submissions";
import { resolveHostId, resolveHostName } from "@/lib/listings/host-listings-utils";
import {
  groupDailyOps,
  listingGoLiveTasks,
  stayHint,
} from "@/lib/host/host-daily-ops";
import { OpsListBadges } from "@/components/dashboard/booking-ops/ops-list-badges";
import { hostBookingDetailPath } from "@/lib/host/host-ops-adapter";
import { formatBookingDate } from "@/lib/booking/display";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import {
  formatNextSevenDaysMeta,
  formatNextSevenDaysSubmeta,
} from "@/lib/host/host-booking-list-utils";
import { cn } from "@/lib/utils";

function todayHeading() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function StayRow({
  booking,
  meta,
  submeta,
  actions,
}: {
  booking: HostBookingRecord;
  meta: string;
  submeta?: string;
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
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{meta}</p>
        {submeta ? (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{submeta}</p>
        ) : (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{stayHint(booking)}</p>
        )}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
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
  tone?: "green" | "red" | "gray";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50",
        tone === "green" && "bg-green-700 text-white hover:bg-green-800",
        tone === "red" && "bg-white border border-red-200 text-red-700 hover:bg-red-50",
        tone === "gray" && "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

export function HostDailyOpsPanel() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const listings = useHostSubmissions(hostId, hostName);
  const { bookings, ready, checkIn, checkOut } = useHostBookings();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState("");

  const ops = useMemo(() => groupDailyOps(bookings), [bookings]);
  const goLive = useMemo(() => listingGoLiveTasks(listings), [listings]);

  async function run(id: string, work: () => Promise<unknown> | unknown, ok: string) {
    setBusyId(id);
    try {
      await work();
      setFlash(ok);
      window.setTimeout(() => setFlash(""), 2500);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Could not update booking.");
      window.setTimeout(() => setFlash(""), 2500);
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) {
    return (
      <div className="bg-white rounded-2xl border p-8 flex items-center justify-center min-h-[160px]">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  const todayCount = ops.arrivals.length + ops.departures.length + ops.onProperty.length;
  const hasOps = todayCount + ops.upcoming.length + goLive.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
            Today on the farm
          </p>
          <h3 className="text-lg font-bold text-gray-900 font-display">{todayHeading()}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Greet arrivals and keep listings bookable — from the same bookings guests just paid.
          </p>
        </div>
        {flash ? <p className="text-xs font-medium text-green-700">{flash}</p> : null}
      </div>

      {!hasOps ? (
        <div className="bg-white rounded-2xl border p-5 flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Quiet day — you’re caught up</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Arrivals and listing fixes will land here. Add a listing or share your live stay so
              the first paid booking can appear on this calendar.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href="/host/new-listing"
                className="text-xs font-semibold bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800"
              >
                Add a listing
              </Link>
              <Link
                href="/host/calendar"
                className="text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                Open calendar
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {todayCount > 0 ? (
        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900">Who’s on the property today</h4>
            <div className="flex items-center gap-3">
              <Link
                href="/host/check-in-out"
                className="text-xs font-semibold text-green-700 hover:underline"
              >
                Check-in / out
              </Link>
              <Link href="/host/calendar" className="text-xs font-semibold text-green-700 hover:underline">
                Calendar
              </Link>
            </div>
          </div>
          {ops.arrivals.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Arrivals
              </p>
              {ops.arrivals.map((booking) => (
                <StayRow
                  key={booking.id}
                  booking={booking}
                  meta={`Arrives today · ${booking.roomType}`}
                  actions={
                    booking.checkInStatus === "pending" ? (
                      <ActionButton
                        disabled={busyId === booking.id}
                        onClick={() =>
                          run(booking.id, () => checkIn(booking.id), "Guest checked in")
                        }
                      >
                        <DoorOpen className="w-3.5 h-3.5" /> Check in
                      </ActionButton>
                    ) : (
                      <span className="text-[11px] font-semibold text-green-700">Checked in</span>
                    )
                  }
                />
              ))}
            </div>
          ) : null}
          {ops.onProperty.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Staying now
              </p>
              {ops.onProperty.map((booking) => (
                <StayRow
                  key={booking.id}
                  booking={booking}
                  meta={`Until ${formatBookingDate(booking.checkOut)}`}
                />
              ))}
            </div>
          ) : null}
          {ops.departures.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Departures
              </p>
              {ops.departures.map((booking) => (
                <StayRow
                  key={booking.id}
                  booking={booking}
                  meta="Leaves today"
                  actions={
                    booking.checkInStatus !== "checked_out" ? (
                      <ActionButton
                        tone="gray"
                        disabled={busyId === booking.id}
                        onClick={() =>
                          run(booking.id, () => checkOut(booking.id), "Guest checked out")
                        }
                      >
                        <DoorClosed className="w-3.5 h-3.5" /> Check out
                      </ActionButton>
                    ) : null
                  }
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {ops.upcoming.length > 0 ? (
        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-green-700" />
            <h4 className="text-sm font-semibold text-gray-900">Next 7 days</h4>
          </div>
          <div className="space-y-2">
            {ops.upcoming.map((booking) => (
              <StayRow
                key={booking.id}
                booking={booking}
                meta={formatNextSevenDaysMeta(booking)}
                submeta={formatNextSevenDaysSubmeta(booking)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {goLive.length > 0 ? (
        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Get more listings live</h4>
          <p className="text-xs text-gray-500">
            Each row says what’s wrong and exactly what to change.
          </p>
          <ul className="space-y-2">
            {goLive.map((task) => (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3.5 py-3 hover:border-green-300 hover:bg-green-50/40"
                >
                  <span className="min-w-0 space-y-1">
                    <span className="block text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </span>
                    <span className="block text-xs text-gray-600">
                      <span className="font-semibold text-gray-800">What’s wrong: </span>
                      {task.detail}
                    </span>
                    <span className="block text-xs text-green-800">
                      <span className="font-semibold">Change: </span>
                      {task.fix}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-green-700 shrink-0 pt-0.5">
                    {task.cta ?? "Fix"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
