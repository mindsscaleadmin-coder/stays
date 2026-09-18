import type { BookingAuditEntry } from "@/lib/host/host-booking-types";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";

function hasPaymentEntry(entries: BookingAuditEntry[]): boolean {
  return entries.some((entry) => /payment/i.test(entry.action));
}

/** Host-facing timeline — reuses booking audit log and adds obvious milestones when missing. */
export function buildBookingActivityTimeline(booking: HostBookingRecord): BookingAuditEntry[] {
  const entries: BookingAuditEntry[] = [...(booking.auditLog ?? [])];

  if (!entries.some((entry) => /booking created/i.test(entry.action))) {
    entries.push({
      id: `synthetic-created-${booking.id}`,
      at: `${booking.bookedAt}T12:00:00.000Z`,
      actor: "System",
      action: "Booking created",
      detail: booking.status,
    });
  }

  if (booking.paymentStatus === "Paid" && !hasPaymentEntry(entries)) {
    entries.push({
      id: `synthetic-paid-${booking.id}`,
      at: `${booking.bookedAt}T12:00:00.000Z`,
      actor: "System",
      action: "Payment received",
      detail: booking.total,
    });
  }

  if (booking.status === "confirmed" && booking.paymentStatus === "Paid") {
    const hasConfirmed = entries.some((entry) => /confirm/i.test(entry.action));
    if (!hasConfirmed) {
      entries.push({
        id: `synthetic-confirmed-${booking.id}`,
        at: `${booking.bookedAt}T12:00:00.000Z`,
        actor: "System",
        action: "Booking confirmed",
      });
    }
  }

  return [...entries].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}
