import type { BookingAuditEntry } from "@/lib/host/host-booking-types";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { HostBookingOpsRecord } from "@/lib/host/host-ops-types";

/** Host-facing timeline for dining/event enquiries (no Booking.auditLog). */
export function buildEventActivityTimeline(
  booking: HostBookingRecord,
  ops: HostBookingOpsRecord | null
): BookingAuditEntry[] {
  const entries: BookingAuditEntry[] = [];

  entries.push({
    id: `event-created-${booking.id}`,
    at: booking.bookedAt,
    actor: booking.guest,
    action: "Enquiry received",
    detail: booking.specialRequests?.trim() || undefined,
  });

  if (booking.eventRespondedAt && booking.eventEnquiryStatus === "available") {
    entries.push({
      id: `event-available-${booking.id}`,
      at: booking.eventRespondedAt,
      actor: "Host",
      action: "Marked available",
      detail: booking.hostNote?.trim() || undefined,
    });
  }

  if (booking.eventRespondedAt && booking.eventEnquiryStatus === "unavailable") {
    entries.push({
      id: `event-unavailable-${booking.id}`,
      at: booking.eventRespondedAt,
      actor: "Host",
      action: "Marked unavailable",
      detail: booking.hostNote?.trim() || undefined,
    });
  }

  if (ops?.assignedStaffId) {
    entries.push({
      id: `event-staff-${booking.id}`,
      at: ops.updatedAt,
      actor: "Host",
      action: "Staff assigned",
    });
  }

  if (ops?.privateNotes?.trim()) {
    entries.push({
      id: `event-note-${booking.id}`,
      at: ops.updatedAt,
      actor: "Host",
      action: "Note updated",
    });
  }

  if (ops?.completedAt) {
    entries.push({
      id: `event-completed-${booking.id}`,
      at: ops.completedAt,
      actor: "Host",
      action: "Marked completed",
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
