"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2 } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { OpsActivityTimeline } from "@/components/dashboard/booking-ops/ops-activity-timeline";
import { OpsCustomerSection } from "@/components/dashboard/booking-ops/ops-customer-section";
import { OpsDetailHeader } from "@/components/dashboard/booking-ops/ops-detail-header";
import { OpsEnquiryBookingSection } from "@/components/dashboard/booking-ops/ops-enquiry-booking-section";
import { OpsEnquiryMessages } from "@/components/dashboard/booking-ops/ops-enquiry-messages";
import { OpsEventCompletionActions } from "@/components/dashboard/booking-ops/ops-event-completion-actions";
import { OpsPrivateNotes } from "@/components/dashboard/booking-ops/ops-private-notes";
import { OpsStaffAssign } from "@/components/dashboard/booking-ops/ops-staff-assign";
import { buildEventActivityTimeline } from "@/lib/host/event-activity-utils";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import { useHostEventBooking } from "@/lib/host/use-host-event-booking";
import { useHostGuestSummary } from "@/lib/host/use-host-guest-summary";
import { useHostOps } from "@/lib/host/use-booking-ops";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/host-listings-utils";

export function HostEventBookingDetailContent({ requestId }: { requestId: string }) {
  const id = decodeURIComponent(requestId);
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { booking, ready, error, refresh: refreshBooking } = useHostEventBooking(id, hostId);
  const { bookings } = useHostBookings();
  const {
    view: opsView,
    saving: opsSaving,
    patch: patchOps,
    refresh: refreshOps,
  } = useHostOps("event_request", id, hostId);
  const { summary: guestSummary, ready: guestSummaryReady } = useHostGuestSummary(
    hostId,
    booking,
    bookings
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const activity = useMemo(
    () => (booking ? buildEventActivityTimeline(booking, opsView.ops) : []),
    [booking, opsView.ops]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleMarkCompleted() {
    setBusy(true);
    try {
      const ops = await patchOps({ completedAt: new Date().toISOString() });
      if (!ops) {
        flash("Could not mark as completed.");
        return;
      }
      await Promise.all([refreshOps(), refreshBooking()]);
      flash("Enquiry marked as completed.");
    } finally {
      setBusy(false);
    }
  }

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
          <h2 className="text-lg font-bold text-gray-900 mb-2">Enquiry not found</h2>
          <p className="text-sm text-gray-500 mb-4">
            {error || "This enquiry may have been removed or the link is invalid."}
          </p>
          <Link href="/host/bookings" className="text-green-700 font-semibold text-sm hover:underline">
            Back to Bookings
          </Link>
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/host/bookings"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Bookings
          </Link>
        </div>

        {message ? (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        ) : null}

        <OpsDetailHeader booking={booking} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <OpsCustomerSection
              booking={booking}
              guestSummary={guestSummary}
              guestSummaryLoading={!guestSummaryReady}
            />
            <OpsEnquiryBookingSection booking={booking} />
            <OpsEnquiryMessages booking={booking} />
            <OpsActivityTimeline
              entries={activity}
              description="Enquiry history and operational updates."
            />
          </div>

          <div className="space-y-6">
            {hostId ? (
            <OpsStaffAssign
              hostId={hostId}
              assignedStaffId={opsView.ops?.assignedStaffId ?? null}
              assignedStaffName={opsView.assignedStaffName}
              saving={opsSaving}
              onAssign={async (staffId) => {
                await patchOps({ assignedStaffId: staffId });
                await refreshOps();
              }}
            />
            ) : null}
            <OpsPrivateNotes
              notes={opsView.ops?.privateNotes ?? ""}
              saving={opsSaving}
              onSave={async (privateNotes) => {
                await patchOps({ privateNotes });
                await refreshOps();
              }}
            />
            <OpsEventCompletionActions
              booking={booking}
              ops={opsView.ops}
              busy={busy || opsSaving}
              onMarkCompleted={handleMarkCompleted}
            />
          </div>
        </div>
      </div>
    </HostDashboardShell>
  );
}
