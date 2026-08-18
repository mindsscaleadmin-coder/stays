"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  DoorClosed,
  DoorOpen,
  Loader2,
  Printer,
  XCircle,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { BookingMessageThread } from "@/components/booking/booking-message-thread";
import { formatBookingDate, STATUS_STYLES } from "@/lib/mock/dashboard-data";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import type { RefundStatus } from "@/lib/host/host-booking-types";
import { displaySpecialRequests, getBookingTimeline } from "@/lib/host/host-booking-utils";
import { CANCELLATION_MATRIX, getCancellationRule } from "@/lib/booking/policies";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

export function HostBookingDetailContent({ bookingId }: { bookingId: string }) {
  const id = decodeURIComponent(bookingId);
  const { user } = useAuth();
  const { booking, ready, accept, decline, cancel, checkIn, checkOut, update, previewCancelRefund } =
    useHostBookings(id);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [refundStatus, setRefundStatus] = useState<RefundStatus>("full");
  const [refundAmount, setRefundAmount] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function handlePrint() {
    window.print();
  }

  const cancelPreview = useMemo(
    () => (booking ? previewCancelRefund(booking, "host") : null),
    [booking, previewCancelRefund]
  );

  if (!ready) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  if (!booking) {
    return (
      <HostDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Booking not found</h2>
          <p className="text-sm text-gray-500 mb-4">
            This booking may have been removed or the link is invalid.
          </p>
          <Link href="/host/bookings" className="text-green-700 font-semibold text-sm hover:underline">
            Back to Bookings
          </Link>
        </div>
      </HostDashboardShell>
    );
  }

  const timeline = getBookingTimeline(booking);
  const specialRequests = displaySpecialRequests(booking);
  const printedAt = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const policy = getCancellationRule(booking.policyId);

  const canCheckIn =
    booking.status === "confirmed" &&
    booking.checkInStatus === "pending" &&
    (timeline === "ongoing" || timeline === "upcoming");
  const canCheckOut = booking.status === "confirmed" && booking.checkInStatus === "checked_in";
  const canCancel =
    booking.status === "confirmed" || booking.status === "pending";

  async function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    setBusy(true);
    try {
      await cancel(booking!.id, {
        reason: cancelReason.trim(),
        refundStatus,
        refundAmount: refundAmount.trim() || undefined,
      });
      setCancelOpen(false);
      setCancelReason("");
      flash("Booking cancelled. Refund applied per policy when eligible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HostDashboardShell>
      <div className="space-y-4 print:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <Link
            href="/host/bookings"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bookings
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {booking.status === "pending" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await accept(booking.id);
                      flash("Booking accepted — dates blocked if paid.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await decline(booking.id);
                      flash("Booking declined — guest refunded when paid.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm border border-gray-300 hover:border-red-400 text-gray-700 hover:text-red-600 px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Decline
                </button>
              </>
            )}
            {canCheckIn && (
              <button
                type="button"
                onClick={() => {
                  checkIn(booking.id);
                  flash("Guest checked in.");
                }}
                className="inline-flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold"
              >
                <DoorOpen className="w-4 h-4" />
                Check in
              </button>
            )}
            {canCheckOut && (
              <button
                type="button"
                onClick={() => {
                  checkOut(booking.id);
                  flash("Guest checked out. Stay marked completed.");
                }}
                className="inline-flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl font-semibold"
              >
                <DoorClosed className="w-4 h-4" />
                Check out
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  const preview = previewCancelRefund(booking, "host");
                  setRefundStatus(
                    preview.band === "full"
                      ? "full"
                      : preview.band === "partial"
                        ? "partial"
                        : "none"
                  );
                  setRefundAmount(
                    preview.refundAmount > 0
                      ? `AED ${preview.refundAmount.toLocaleString()}`
                      : ""
                  );
                  setCancelOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2 rounded-xl font-semibold"
              >
                Cancel booking
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-sm border border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-700 px-4 py-2 rounded-xl font-semibold"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-100 text-green-800 text-sm rounded-xl px-4 py-3 print:hidden">
            {message}
          </div>
        )}

        {booking.status === "pending" && booking.expiresAt && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3 print:hidden flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Request-to-book — respond by deadline</p>
              <p className="text-amber-800/90 text-xs mt-0.5">
                Expires {new Date(booking.expiresAt).toLocaleString()}. If you don’t accept or
                decline in time, the request auto-expires and paid guests are refunded.
              </p>
            </div>
          </div>
        )}

        {booking.status === "expired" && (
          <div className="bg-gray-100 border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-3 print:hidden">
            This request expired because it wasn’t answered before the host deadline.
          </div>
        )}

        <div className="print:hidden">
          <BookingMessageThread
            bookingId={booking.id}
            viewerRole="host"
            viewerId={user?.id || booking.hostId || "host"}
            viewerName={user?.fullName || booking.hostName || "Host"}
            title="Messages with guest"
            subtitle={`${booking.guest} · ${booking.property}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
          <section className="bg-white rounded-2xl border p-4 space-y-3 lg:col-span-1">
            <h3 className="text-sm font-semibold text-gray-900">Check-in / check-out</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium capitalize text-gray-900">
                  {booking.checkInStatus.replace("_", " ")}
                </dd>
              </div>
              {booking.checkedInAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Checked in</dt>
                  <dd className="text-gray-900 text-end">
                    {new Date(booking.checkedInAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {booking.checkedOutAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Checked out</dt>
                  <dd className="text-gray-900 text-end">
                    {new Date(booking.checkedOutAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="bg-white rounded-2xl border p-4 space-y-3 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900">Cancellation & refund</h3>
            {booking.status === "cancelled" ? (
              <dl className="space-y-2 text-sm">
                {booking.cancelledAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Cancelled</dt>
                    <dd className="text-gray-900">
                      {new Date(booking.cancelledAt).toLocaleString()}
                    </dd>
                  </div>
                )}
                {booking.cancellationReason && (
                  <div>
                    <dt className="text-gray-500 text-xs mb-1">Reason</dt>
                    <dd className="text-gray-800 bg-gray-50 rounded-lg px-3 py-2">
                      {booking.cancellationReason}
                    </dd>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-gray-500">Refund:</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                      booking.refundStatus === "full"
                        ? "bg-green-100 text-green-700"
                        : booking.refundStatus === "partial"
                          ? "bg-amber-100 text-amber-800"
                          : booking.refundStatus === "pending"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {booking.refundStatus}
                  </span>
                  {booking.refundAmount && (
                    <span className="text-sm font-semibold text-gray-900">
                      {booking.refundAmount}
                    </span>
                  )}
                </div>
                {booking.refundStatus === "pending" && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        update(booking.id, {
                          refundStatus: "full",
                          paymentStatus: "Refunded",
                        });
                        flash("Refund marked as completed.");
                      }}
                      className="text-xs bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg font-semibold"
                    >
                      Mark refund complete
                    </button>
                  </div>
                )}
              </dl>
            ) : (
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  Policy: <span className="font-semibold text-gray-900">{policy.label}</span> —{" "}
                  {policy.shortDescription}
                </p>
                <p className="text-xs text-gray-500">
                  Host cancellations refund the guest in full when paid. Guest cancellations use
                  the matrix below.
                </p>
                <ul className="text-[11px] text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
                  {CANCELLATION_MATRIX.map((row) => (
                    <li key={row.id}>
                      <span className="font-semibold text-gray-700">{row.label}:</span>{" "}
                      {row.shortDescription}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <article className="booking-sheet bg-white rounded-2xl border shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border print:border-black max-w-3xl mx-auto">
          <header className="booking-sheet-header border-b px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Greenfield Farm Stays
              </p>
              <h1 className="text-xl font-bold text-gray-900 font-display mt-1">Booking confirmation</h1>
              <p className="text-sm text-gray-500 mt-1 font-mono">{booking.id}</p>
            </div>
            <div className="text-end shrink-0">
              <span
                className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[booking.status]} print:bg-transparent print:border print:border-black print:text-black print:rounded-none`}
              >
                {booking.status}
              </span>
              <p className="text-[11px] text-gray-400 mt-2 hidden print:block">Printed {printedAt}</p>
            </div>
          </header>

          <div className="px-6 py-5 space-y-0 divide-y">
            <Section title="1. Stay details">
              <DetailRow label="Property" value={booking.property} />
              <DetailRow label="Location" value={booking.propertyLocation} />
              <DetailRow label="Room type" value={booking.roomType} />
              <DetailRow label="Check-in" value={formatBookingDate(booking.checkIn)} />
              <DetailRow label="Check-out" value={formatBookingDate(booking.checkOut)} />
              <DetailRow label="Nights" value={String(booking.nights)} />
              <DetailRow
                label="Guests"
                value={`${booking.guests} (${booking.adults} adults${booking.children ? `, ${booking.children} children` : ""})`}
              />
              <DetailRow label="Booked on" value={formatBookingDate(booking.bookedAt)} />
            </Section>

            <Section title="2. Guest details">
              <DetailRow label="Name" value={booking.guest} />
              <DetailRow label="Email" value={booking.guestEmail} />
              <DetailRow label="Phone" value={booking.guestPhone} />
              <DetailRow label="Country" value={booking.guestCountry} />
              <DetailRow label="Headcount" value={`${booking.guests} total`} />
              <DetailRow
                label="Special requests"
                value={specialRequests || "None provided."}
                stack
              />
              <DetailRow
                label="Dietary needs"
                value={booking.dietaryNeeds?.trim() || "None provided."}
                stack
              />
            </Section>

            <Section title="3. Payment summary">
              <DetailRow label="Nightly rate" value={`${booking.nightlyRate} × ${booking.nights}`} />
              <DetailRow label="Cleaning fee" value={booking.cleaningFee} />
              <DetailRow label="Service fee" value={booking.serviceFee} />
              <DetailRow label="Payment method" value={booking.paymentMethod} />
              <DetailRow label="Payment status" value={booking.paymentStatus} />
              <div className="flex items-center justify-between gap-4 pt-3 mt-1 border-t border-dashed">
                <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Total</span>
                <span className="text-lg font-bold text-green-700 print:text-black">{booking.total}</span>
              </div>
            </Section>
          </div>

          <footer className="border-t px-6 py-4 bg-gray-50 print:bg-transparent booking-sheet-footer">
            <p className="text-xs text-gray-500 leading-relaxed">
              This document is for host records. Keep a printed or digital copy with check-in and
              guest contact details. Contact support if payment or guest information looks incorrect.
            </p>
          </footer>
        </article>
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 print:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setCancelOpen(false)}
          />
          <form
            onSubmit={handleCancelSubmit}
            className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-gray-900">Cancel booking</h3>
            <p className="text-xs text-gray-500 -mt-1">
              {cancelPreview?.summary}
              {cancelPreview?.stripeEligible
                ? " · Stripe refund will be attempted when configured."
                : ""}
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1 block">Reason</span>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Why is this booking being cancelled?"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1 block">Refund</span>
              <select
                value={refundStatus}
                onChange={(e) => setRefundStatus(e.target.value as RefundStatus)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="none">No refund</option>
                <option value="pending">Refund pending</option>
                <option value="partial">Partial refund</option>
                <option value="full">Full refund</option>
              </select>
            </label>
            {refundStatus !== "none" && (
              <label className="block">
                <span className="text-xs font-semibold text-gray-600 mb-1 block">Refund amount</span>
                <input
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. AED 2,280"
                />
              </label>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold"
              >
                Keep booking
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Confirm cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            margin: 16mm;
          }
          body {
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          .booking-sheet,
          .booking-sheet * {
            visibility: visible !important;
          }
          .booking-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </HostDashboardShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-3">{title}</h2>
      <dl className="space-y-2.5">{children}</dl>
    </section>
  );
}

function DetailRow({
  label,
  value,
  stack = false,
}: {
  label: string;
  value: string;
  stack?: boolean;
}) {
  if (stack) {
    return (
      <div className="pt-1">
        <dt className="text-xs text-gray-500 mb-1">{label}</dt>
        <dd className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap border border-gray-100 rounded-lg px-3 py-2 print:border-black print:rounded-none">
          {value}
        </dd>
      </div>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-6 text-sm">
      <dt className="text-gray-500 shrink-0 w-32 sm:w-40">{label}</dt>
      <dd className="text-gray-900 font-medium text-end flex-1">{value}</dd>
    </div>
  );
}
