"use client";

import { Link } from "@/i18n/routing";
import {
  DoorClosed,
  DoorOpen,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import {
  canHostCancel,
  canHostCheckIn,
  canHostCheckOut,
  canHostMarkCompleted,
  showReviewRequestNudge,
} from "@/lib/host/booking-completion-utils";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { BookingTimelineTab } from "@/lib/host/host-booking-types";

export function OpsCompletionActions({
  booking,
  timeline,
  busy,
  onCheckIn,
  onCheckOut,
  onMarkCompleted,
  onCancel,
}: {
  booking: HostBookingRecord;
  timeline: BookingTimelineTab;
  busy?: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onMarkCompleted: () => void;
  onCancel: () => void;
}) {
  const checkIn = canHostCheckIn(booking, timeline);
  const checkOut = canHostCheckOut(booking);
  const markCompleted = canHostMarkCompleted(booking);
  const cancel = canHostCancel(booking);
  const reviewNudge = showReviewRequestNudge(booking);
  const hasActions = checkIn || checkOut || markCompleted || cancel;

  return (
    <OpsSectionCard title="Completion">
      {hasActions ? (
        <div className="flex flex-wrap gap-2">
          {checkIn ? (
            <button
              type="button"
              disabled={busy}
              onClick={onCheckIn}
              className="inline-flex items-center gap-1.5 text-sm bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
            >
              <DoorOpen className="w-4 h-4" />
              Check in
            </button>
          ) : null}
          {checkOut ? (
            <button
              type="button"
              disabled={busy}
              onClick={onCheckOut}
              className="inline-flex items-center gap-1.5 text-sm bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
            >
              <DoorClosed className="w-4 h-4" />
              Check out
            </button>
          ) : null}
          {markCompleted ? (
            <button
              type="button"
              disabled={busy}
              onClick={onMarkCompleted}
              className="inline-flex items-center gap-1.5 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Mark as completed
            </button>
          ) : null}
          {cancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-sm text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl font-semibold ms-auto"
            >
              Cancel booking
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {booking.status === "completed"
            ? "This booking is completed."
            : "No completion actions are available right now."}
        </p>
      )}

      {reviewNudge ? (
        <div className="mt-4 rounded-xl bg-green-50 border border-green-100 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-900">Booking completed</p>
            <p className="text-xs text-green-800/80 mt-0.5">
              The guest can now leave a review. You can view and respond on your reviews page.
            </p>
          </div>
          <Link
            href="/host/reviews"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-white border border-green-200 text-green-800 px-3 py-2 rounded-lg hover:bg-green-100/60 shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            View reviews
          </Link>
        </div>
      ) : null}

      {booking.status !== "pending" && booking.checkInStatus !== "pending" ? (
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[11px] font-medium text-gray-400">Arrival status</dt>
            <dd className="font-semibold text-gray-900 capitalize mt-0.5">
              {booking.checkInStatus.replace("_", " ")}
            </dd>
          </div>
          {booking.checkedInAt ? (
            <div>
              <dt className="text-[11px] font-medium text-gray-400">
                Checked in{booking.checkInSource ? ` (${booking.checkInSource})` : ""}
              </dt>
              <dd className="text-gray-800 mt-0.5">
                {new Date(booking.checkedInAt).toLocaleString()}
              </dd>
            </div>
          ) : null}
          {booking.checkedOutAt ? (
            <div>
              <dt className="text-[11px] font-medium text-gray-400">
                Checked out{booking.checkOutSource ? ` (${booking.checkOutSource})` : ""}
              </dt>
              <dd className="text-gray-800 mt-0.5">
                {new Date(booking.checkedOutAt).toLocaleString()}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </OpsSectionCard>
  );
}
