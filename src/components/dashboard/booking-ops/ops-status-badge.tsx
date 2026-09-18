import { isEventOpsRecord } from "@/lib/host/host-ops-adapter";
import {
  operationalStatusForBooking,
  operationalStatusForEventRequest,
  operationalStatusLabel,
} from "@/lib/host/operational-status";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { OperationalStatus } from "@/lib/host/host-ops-types";
import { cn } from "@/lib/utils";

const OPS_STATUS_STYLES: Record<OperationalStatus, string> = {
  confirmed: "bg-green-100 text-green-800",
  upcoming: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-900",
  completed: "bg-gray-200 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

export function OpsStatusBadge({ booking }: { booking: HostBookingRecord }) {
  const status =
    booking.operationalStatus ??
    (isEventOpsRecord(booking)
      ? operationalStatusForEventRequest({
          status: booking.eventEnquiryStatus ?? booking.status,
          eventDate: booking.dateFlexible ? null : booking.checkIn,
          dateFlexible: Boolean(booking.dateFlexible),
        })
      : operationalStatusForBooking({
          status: booking.status,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
        }));

  return (
    <span
      className={cn(
        "inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide",
        OPS_STATUS_STYLES[status]
      )}
    >
      {operationalStatusLabel(status)}
    </span>
  );
}
