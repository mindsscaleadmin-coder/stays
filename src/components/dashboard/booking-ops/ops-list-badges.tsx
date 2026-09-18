import { OpsStatusBadge } from "@/components/dashboard/booking-ops/ops-status-badge";
import { hostBookingCategoryLabel, bookingCategoryForRecord } from "@/lib/host/booking-category";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { cn } from "@/lib/utils";

export function OpsListBadges({
  booking,
  className,
}: {
  booking: HostBookingRecord;
  className?: string;
}) {
  const category = hostBookingCategoryLabel(bookingCategoryForRecord(booking));

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
        {category}
      </span>
      <OpsStatusBadge booking={booking} />
      {booking.assignedStaffName ? (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800">
          {booking.assignedStaffName}
        </span>
      ) : null}
    </div>
  );
}
