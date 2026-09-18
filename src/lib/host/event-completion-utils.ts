import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { HostBookingOpsRecord } from "@/lib/host/host-ops-types";
import { isEventOpsRecord } from "@/lib/host/host-ops-adapter";

export function canHostMarkEventCompleted(
  booking: HostBookingRecord,
  ops: HostBookingOpsRecord | null
): boolean {
  if (!isEventOpsRecord(booking)) return false;
  if (booking.eventEnquiryStatus !== "available") return false;
  if (ops?.completedAt) return false;
  return true;
}
