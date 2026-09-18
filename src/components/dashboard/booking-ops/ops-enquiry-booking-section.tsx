import { MapPin } from "lucide-react";
import { OpsCardRow } from "@/components/dashboard/booking-ops/ops-card-row";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import { hostBookingCategoryLabel, bookingCategoryForRecord } from "@/lib/host/booking-category";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { formatBookingDate } from "@/lib/booking/display";

function formatEventDate(booking: HostBookingRecord): string {
  if (booking.dateFlexible) return "Flexible date";
  return formatBookingDate(booking.checkIn);
}

export function OpsEnquiryBookingSection({ booking }: { booking: HostBookingRecord }) {
  const categoryLabel = hostBookingCategoryLabel(bookingCategoryForRecord(booking));

  return (
    <OpsSectionCard title="Booking">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <OpsCardRow label="Category" value={categoryLabel} />
        <OpsCardRow label="Enquiry ref" value={booking.bookingReference || booking.id} />
        <OpsCardRow label="Listing" value={booking.property} />
        {booking.eventSpaceName ? (
          <OpsCardRow label="Space" value={booking.eventSpaceName} />
        ) : null}
        {booking.eventOccasion ? (
          <OpsCardRow label="Occasion" value={booking.eventOccasion} />
        ) : null}
        {booking.eventPartyType ? (
          <OpsCardRow label="Party type" value={booking.eventPartyType} />
        ) : null}
        <OpsCardRow label="Location" value={booking.propertyLocation || "—"} icon={MapPin} />
        <OpsCardRow label="Submitted" value={formatBookingDate(booking.bookedAt)} />
        <OpsCardRow label="Event date" value={formatEventDate(booking)} />
        <OpsCardRow label="Guests" value={String(booking.guests)} />
        <OpsCardRow label="Payment" value="Enquiry — no online payment" />
      </dl>
    </OpsSectionCard>
  );
}
