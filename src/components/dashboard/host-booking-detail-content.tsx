"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { BookingMessageThread } from "@/components/booking/booking-message-thread";
import { OpsBookingSection } from "@/components/dashboard/booking-ops/ops-booking-section";
import { OpsCardRow } from "@/components/dashboard/booking-ops/ops-card-row";
import { OpsCustomerSection } from "@/components/dashboard/booking-ops/ops-customer-section";
import { OpsActivityTimeline } from "@/components/dashboard/booking-ops/ops-activity-timeline";
import { OpsCompletionActions } from "@/components/dashboard/booking-ops/ops-completion-actions";
import { OpsDetailHeader } from "@/components/dashboard/booking-ops/ops-detail-header";
import { OpsPrivateNotes } from "@/components/dashboard/booking-ops/ops-private-notes";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import { OpsStaffAssign } from "@/components/dashboard/booking-ops/ops-staff-assign";
import { formatBookingDate, STATUS_STYLES } from "@/lib/booking/display";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import type { RefundStatus } from "@/lib/host/host-booking-types";
import { displaySpecialRequests, getBookingTimeline } from "@/lib/host/host-booking-utils";
import { getCancellationRule } from "@/lib/booking/policies";
import { useAuth } from "@/components/providers/auth-provider";
import { useBookingOps } from "@/lib/host/use-booking-ops";
import { useHostGuestSummary } from "@/lib/host/use-host-guest-summary";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import { cn } from "@/lib/utils";

export function HostBookingDetailContent({ bookingId }: { bookingId: string }) {
  const id = decodeURIComponent(bookingId);
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const {
    booking,
    bookings,
    ready,
    refresh,
    cancel,
    checkIn,
    checkOut,
    update,
    previewCancelRefund,
  } = useHostBookings(id);
  const {
    view: opsView,
    saving: opsSaving,
    error: opsError,
    patch: patchOps,
  } = useBookingOps(id, hostId);
  const { summary: guestSummary, ready: guestSummaryReady } = useHostGuestSummary(
    hostId,
    booking,
    bookings
  );
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

  const moneyCurrency =
    booking.currency ||
    booking.total.match(/^([A-Z]{3})\b/)?.[1] ||
    "AED";

  function formatMoneyAmount(amount: number): string {
    return `${moneyCurrency} ${amount.toLocaleString()}`;
  }

  const policy = getCancellationRule(booking.policyId);

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
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not cancel booking.");
    } finally {
      setBusy(false);
    }
  }

  function openCancel() {
    const preview = previewCancelRefund(booking!, "host");
    setRefundStatus(
      preview.band === "full" ? "full" : preview.band === "partial" ? "partial" : "none"
    );
    setRefundAmount(
      preview.refundAmount > 0 ? formatMoneyAmount(preview.refundAmount) : ""
    );
    setCancelOpen(true);
  }

  return (
    <HostDashboardShell>
      <div className="space-y-4 print:space-y-0">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link
            href="/host/bookings"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-green-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to bookings</span>
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print summary
          </button>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-100 text-green-800 text-sm rounded-2xl px-4 py-3 print:hidden">
            {message}
          </div>
        )}
        {opsError && (
          <div className="bg-red-50 border border-red-100 text-red-800 text-sm rounded-2xl px-4 py-3 print:hidden">
            {opsError}
          </div>
        )}

        <OpsDetailHeader booking={booking} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start print:hidden">
          <div className="lg:col-span-3 space-y-4">
            <OpsCustomerSection
              booking={booking}
              guestSummary={guestSummary}
              guestSummaryLoading={!guestSummaryReady}
            />
            <OpsBookingSection booking={booking} />

            <OpsSectionCard title="Payment">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <OpsCardRow
                  label="Listed nightly"
                  value={`${booking.nightlyRate} × ${booking.nights}`}
                />
                {booking.averageNightlyTotal ? (
                  <OpsCardRow
                    label="Avg / night (incl. fees)"
                    value={booking.averageNightlyTotal}
                  />
                ) : null}
                <OpsCardRow label="Cleaning" value={booking.cleaningFee} />
                <OpsCardRow label="Service" value={booking.serviceFee} />
                <OpsCardRow label="Method" value={booking.paymentMethod} />
                <OpsCardRow label="Status" value={booking.paymentStatus} />
                {booking.currency ? <OpsCardRow label="Currency" value={booking.currency} /> : null}
              </dl>
              <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                Total may include room selection, seasonal rates, discounts, extras, and tax from
                checkout — so listed nightly × nights can differ from the amount paid.
              </p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-gray-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Total paid
                </span>
                <span className="text-lg font-bold text-gray-900 tabular-nums">{booking.total}</span>
              </div>
            </OpsSectionCard>

            <OpsActivityTimeline booking={booking} />
          </div>

          <aside className="lg:col-span-2 space-y-4">
            <OpsCompletionActions
              booking={booking}
              timeline={timeline}
              busy={busy}
              onCheckIn={async () => {
                setBusy(true);
                try {
                  await checkIn(booking.id);
                  await refresh({ force: true });
                  flash("Guest checked in.");
                } catch (error) {
                  flash(error instanceof Error ? error.message : "Could not check in guest.");
                } finally {
                  setBusy(false);
                }
              }}
              onCheckOut={async () => {
                setBusy(true);
                try {
                  await checkOut(booking.id);
                  await refresh({ force: true });
                  flash("Guest checked out. Stay marked completed.");
                } catch (error) {
                  flash(error instanceof Error ? error.message : "Could not check out guest.");
                } finally {
                  setBusy(false);
                }
              }}
              onMarkCompleted={async () => {
                setBusy(true);
                try {
                  await checkOut(booking.id);
                  await refresh({ force: true });
                  flash("Experience marked completed. Guest can leave a review.");
                } catch (error) {
                  flash(
                    error instanceof Error ? error.message : "Could not mark booking completed."
                  );
                } finally {
                  setBusy(false);
                }
              }}
              onCancel={openCancel}
            />

            {hostId ? (
              <>
                <OpsStaffAssign
                  hostId={hostId}
                  assignedStaffId={opsView.ops?.assignedStaffId ?? null}
                  assignedStaffName={opsView.assignedStaffName}
                  saving={opsSaving}
                  onAssign={async (staffId) => {
                    const result = await patchOps({ assignedStaffId: staffId });
                    if (result) {
                      await refresh({ force: true });
                      flash(staffId ? "Staff assigned." : "Staff unassigned.");
                    }
                  }}
                />
                <OpsPrivateNotes
                  notes={opsView.ops?.privateNotes ?? ""}
                  saving={opsSaving}
                  onSave={async (privateNotes) => {
                    const result = await patchOps({ privateNotes });
                    if (result) await refresh({ force: true });
                  }}
                />
              </>
            ) : null}

            <BookingMessageThread
              bookingId={booking.id}
              viewerRole="host"
              viewerId={user?.id || booking.hostId || "host"}
              viewerName={user?.fullName || booking.hostName || "Host"}
              title="Messages"
              subtitle={booking.guest}
              compact
            />

            <section className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-3">
                Cancellation
              </h2>
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
                      onClick={async () => {
                        try {
                          await update(booking.id, {
                            refundStatus: "full",
                            paymentStatus: "Refunded",
                          });
                          flash("Refund marked as completed.");
                        } catch (error) {
                          flash(
                            error instanceof Error
                              ? error.message
                              : "Could not complete refund."
                          );
                        }
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
                  <span className="font-semibold text-gray-900">{policy.label}</span>
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">{policy.shortDescription}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Host cancellations refund the guest in full when paid.
                </p>
              </div>
            )}
            </section>
          </aside>
        </div>

        <article className="booking-sheet hidden print:block bg-white rounded-2xl border shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border print:border-black max-w-3xl mx-auto">
          <header className="booking-sheet-header border-b px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Greenfield Farm Stays
              </p>
              <h1 className="text-xl font-bold text-gray-900 font-display mt-1">Booking confirmation</h1>
              <p className="text-sm text-gray-500 mt-1">
                Booking reference{" "}
                <span className="font-mono font-semibold text-gray-900">
                  {booking.bookingReference || booking.id}
                </span>
              </p>
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
                  placeholder={`e.g. ${moneyCurrency} 2,280`}
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
