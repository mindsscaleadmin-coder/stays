import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";

function MessageBlock({
  label,
  author,
  body,
}: {
  label: string;
  author: string;
  body: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3">
      <p className="text-[11px] font-semibold text-gray-400 mb-1">{label}</p>
      <p className="text-xs font-semibold text-gray-700 mb-1">{author}</p>
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

/** Enquiry thread for dining/events — not a live chat; shows the original message and host reply. */
export function OpsEnquiryMessages({ booking }: { booking: HostBookingRecord }) {
  const guestMessage = booking.specialRequests?.trim() || booking.guestNotes?.trim();
  const hostReply = booking.hostNote?.trim();

  return (
    <OpsSectionCard title="Enquiry messages">
      <p className="text-xs text-gray-500 mb-3">
        This is an availability enquiry, not a live message thread. Contact the guest directly
        using the details above once you have confirmed the date.
      </p>
      <div className="space-y-3">
        <MessageBlock
          label="Guest enquiry"
          author={booking.guest}
          body={guestMessage || "No message provided."}
        />
        {hostReply ? (
          <MessageBlock label="Your reply to guest" author="You" body={hostReply} />
        ) : (
          <p className="text-sm text-gray-500">You have not added a reply note for the guest yet.</p>
        )}
      </div>
    </OpsSectionCard>
  );
}
