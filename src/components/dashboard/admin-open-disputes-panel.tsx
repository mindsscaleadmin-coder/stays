"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { Scale, X } from "lucide-react";
import { BookingMessageThread } from "@/components/booking/booking-message-thread";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminBookings } from "@/lib/admin/use-admin-bookings";
import { formatBookingDate } from "@/lib/mock/dashboard-data";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function DisputeIntervenePanel({
  booking,
  onClose,
  onResolve,
  onUpdateNotes,
  onFlash,
}: {
  booking: HostBookingRecord;
  onClose: () => void;
  onResolve: (resolution: string) => void;
  onUpdateNotes: (guestClaim: string, hostResponse: string) => void;
  onFlash: (text: string) => void;
}) {
  const { user } = useAuth();
  const [resolution, setResolution] = useState("");
  const [guestClaim, setGuestClaim] = useState(booking.disputeGuestClaim ?? "");
  const [hostResponse, setHostResponse] = useState(booking.disputeHostResponse ?? "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-display font-semibold text-gray-900">
              {booking.bookingReference || booking.id}
            </h3>
            <p className="text-xs text-gray-500">
              {booking.guest} vs {booking.hostName ?? "Host"} · {booking.property}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          <section className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Check-in</p>
              <p className="text-gray-700">{formatBookingDate(booking.checkIn)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Check-out</p>
              <p className="text-gray-700">{formatBookingDate(booking.checkOut)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Total</p>
              <p className="font-semibold text-green-700">{booking.total}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Payment</p>
              <p className="text-gray-700">{booking.paymentStatus}</p>
            </div>
          </section>

          <section className="border rounded-xl p-4 space-y-3 bg-orange-50/50 border-orange-100">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-orange-600" />
              <h4 className="font-display font-semibold text-gray-900">
                Dispute · {booking.disputeStatus}
              </h4>
            </div>
            {booking.disputeSummary && (
              <p className="text-sm text-gray-700">{booking.disputeSummary}</p>
            )}
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Guest claim</span>
              <textarea
                value={guestClaim}
                onChange={(e) => setGuestClaim(e.target.value)}
                rows={2}
                className={cn(inputClass, "mt-1 resize-y")}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Host response</span>
              <textarea
                value={hostResponse}
                onChange={(e) => setHostResponse(e.target.value)}
                rows={2}
                className={cn(inputClass, "mt-1 resize-y")}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onUpdateNotes(guestClaim, hostResponse);
                  onFlash("Dispute notes saved.");
                }}
                className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:border-green-400"
              >
                Save notes
              </button>
              {booking.disputeStatus === "open" && (
                <>
                  <input
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Resolution summary…"
                    className={cn(inputClass, "flex-1 min-w-[160px]")}
                  />
                  <button
                    type="button"
                    disabled={!resolution.trim()}
                    onClick={() => {
                      onResolve(resolution.trim());
                      onFlash("Dispute resolved.");
                      onClose();
                    }}
                    className="text-xs bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
                  >
                    Resolve dispute
                  </button>
                </>
              )}
            </div>
            {booking.disputeResolution && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                Resolved: {booking.disputeResolution}
              </p>
            )}
          </section>

          <BookingMessageThread
            bookingId={booking.id}
            viewerRole="admin"
            viewerId={user?.id || "admin"}
            viewerName={user?.fullName || "Support"}
            title="Dispute thread (guest ↔ host)"
            subtitle="Same conversation as Account / Host booking — not a separate inbox."
            compact
          />

          <p className="text-xs text-gray-500">
            Need force cancel or refund?{" "}
            <Link
              href="/admin/bookings"
              className="font-semibold text-green-700 hover:underline"
            >
              Open Booking Oversight
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Open booking disputes — home for Support & Disputes. */
export function AdminOpenDisputesPanel({
  onFlash,
}: {
  onFlash?: (text: string) => void;
}) {
  const {
    ready,
    bookings,
    openDisputeCount,
    resolveDispute,
    updateDisputeNotes,
  } = useAdminBookings();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const disputes = useMemo(
    () => bookings.filter((b) => b.disputeStatus === "open"),
    [bookings]
  );

  const selected = useMemo(
    () => (selectedId ? bookings.find((b) => b.id === selectedId) ?? null : null),
    [bookings, selectedId]
  );

  function flash(text: string) {
    onFlash?.(text);
  }

  if (!ready) {
    return (
      <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
        Loading disputes…
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <p className="text-xs text-gray-500 flex items-start gap-1.5">
          <Scale className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Guest vs host booking conflicts ({openDisputeCount} open). Intervene here — tickets
          below remain for general support requests.
        </p>

        {disputes.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center">
            <Scale className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No open booking disputes</p>
            <p className="text-xs text-gray-400 mt-1">
              When a guest reports a problem on a booking, it appears here for support.
            </p>
          </div>
        ) : (
          disputes.map((b) => (
            <article key={b.id} className="bg-white rounded-2xl border p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-gray-900">
                    {b.bookingReference || b.id} · {b.guest} vs {b.hostName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">{b.property}</p>
                  {b.disputeSummary && (
                    <p className="text-sm text-gray-700 mt-2">{b.disputeSummary}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className="text-xs bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold shrink-0"
                >
                  Intervene
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] font-semibold uppercase text-blue-600 mb-1">
                    Guest claim
                  </p>
                  <p className="text-gray-700">{b.disputeGuestClaim || "—"}</p>
                </div>
                <div className="bg-green-50/50 border border-green-100 rounded-xl p-3">
                  <p className="text-[10px] font-semibold uppercase text-green-700 mb-1">
                    Host response
                  </p>
                  <p className="text-gray-700">{b.disputeHostResponse || "—"}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {selected && (
        <DisputeIntervenePanel
          booking={selected}
          onClose={() => setSelectedId(null)}
          onResolve={(resolution) => resolveDispute(selected.id, resolution)}
          onUpdateNotes={(guestClaim, hostResponse) =>
            updateDisputeNotes(selected.id, { guestClaim, hostResponse })
          }
          onFlash={flash}
        />
      )}
    </>
  );
}
