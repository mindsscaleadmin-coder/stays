import { MapPin } from "lucide-react";
import { OpsCardRow } from "@/components/dashboard/booking-ops/ops-card-row";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import { bookingCategoryForRecord, hostBookingCategoryLabel } from "@/lib/host/booking-category";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { formatBookingDate } from "@/lib/mock/dashboard-data";

export function OpsBookingSection({ booking }: { booking: HostBookingRecord }) {
  const category = bookingCategoryForRecord(booking);
  const categoryLabel = hostBookingCategoryLabel(category);
  const isExperience = category === "experience";

  return (
    <OpsSectionCard title="Booking">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <OpsCardRow label="Category" value={categoryLabel} />
        <OpsCardRow label="Booking ref" value={booking.bookingReference || booking.id} />
        <OpsCardRow label="Listing" value={booking.property} />
        {!isExperience ? <OpsCardRow label="Room" value={booking.roomType} /> : null}
        <OpsCardRow label="Location" value={booking.propertyLocation} icon={MapPin} />
        {booking.propertyReference ? (
          <OpsCardRow label="Property ref" value={booking.propertyReference} />
        ) : null}
        <OpsCardRow label="Booked" value={formatBookingDate(booking.bookedAt)} />
        {isExperience ? (
          <>
            <OpsCardRow label="Date" value={formatBookingDate(booking.checkIn)} />
            {booking.experienceSessionLabel ? (
              <OpsCardRow label="Session" value={booking.experienceSessionLabel} />
            ) : null}
            <OpsCardRow label="Participants" value={String(booking.guests)} />
          </>
        ) : (
          <>
            <OpsCardRow label="Check-in" value={formatBookingDate(booking.checkIn)} />
            <OpsCardRow label="Check-out" value={formatBookingDate(booking.checkOut)} />
            <OpsCardRow label="Nights" value={String(booking.nights)} />
            <OpsCardRow label="Guests" value={String(booking.guests)} />
          </>
        )}
        <OpsCardRow label="Payment" value={booking.paymentStatus} />
      </dl>
    </OpsSectionCard>
  );
}
