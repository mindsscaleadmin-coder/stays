import { OpsCardRow } from "@/components/dashboard/booking-ops/ops-card-row";
import { OpsCustomerHistory } from "@/components/dashboard/booking-ops/ops-customer-history";
import { OpsQuickContact } from "@/components/dashboard/booking-ops/ops-quick-contact";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import type { HostGuestBookingSummary } from "@/lib/host/customer-history-types";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { displaySpecialRequests } from "@/lib/host/host-booking-utils";

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3">
      <p className="text-[11px] font-semibold text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export function OpsCustomerSection({
  booking,
  guestSummary,
  guestSummaryLoading,
}: {
  booking: HostBookingRecord;
  guestSummary?: HostGuestBookingSummary | null;
  guestSummaryLoading?: boolean;
}) {
  const specialRequests = displaySpecialRequests(booking);

  return (
    <OpsSectionCard title="Customer">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <OpsCardRow label="Name" value={booking.guest} />
        <OpsCardRow
          label="Guests"
          value={`${booking.guests} (${booking.adults} adults${booking.children ? `, ${booking.children} children` : ""})`}
        />
        {booking.guestEmail ? <OpsCardRow label="Email" value={booking.guestEmail} /> : null}
        {booking.guestPhone ? <OpsCardRow label="Phone" value={booking.guestPhone} /> : null}
        {booking.guestCountry ? <OpsCardRow label="Country" value={booking.guestCountry} /> : null}
      </dl>
      <div className="mt-4">
        <OpsQuickContact email={booking.guestEmail} phone={booking.guestPhone} />
      </div>
      <OpsCustomerHistory summary={guestSummary ?? null} loading={guestSummaryLoading} />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NoteBlock label="Special requests" value={specialRequests || "None provided."} />
        <NoteBlock
          label="Dietary needs"
          value={booking.dietaryNeeds?.trim() || "None provided."}
        />
      </div>
    </OpsSectionCard>
  );
}
