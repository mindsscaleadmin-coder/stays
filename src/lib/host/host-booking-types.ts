import type { HostBooking, HostBookingStatus } from "@/lib/mock/dashboard-data";
import type { EventAvailabilityStatus } from "@/lib/events/event-availability-types";
import type { HostBookingCategory } from "@/lib/host/booking-category";
import type { HostOpsSourceType, OperationalStatus } from "@/lib/host/host-ops-types";

export type CheckInOutStatus = "pending" | "checked_in" | "checked_out";
export type RefundStatus = "none" | "pending" | "partial" | "full";
export type BookingTimelineTab = "upcoming" | "ongoing" | "past" | "all";

export type DisputeStatus = "none" | "open" | "resolved";

export interface BookingAuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface HostBookingRecord extends HostBooking {
  bookingReference?: string;
  hostId?: string;
  hostName?: string;
  listingId?: string;
  guestId?: string;
  category?: HostBookingCategory;
  experienceSlotId?: string | null;
  experienceSessionLabel?: string;
  /** When set, this row is a dining/event enquiry rather than a paid booking. */
  opsSourceType?: HostOpsSourceType;
  eventOccasion?: string;
  eventPartyType?: string;
  eventSpaceName?: string;
  dateFlexible?: boolean;
  hostNote?: string;
  eventEnquiryStatus?: EventAvailabilityStatus;
  eventRespondedAt?: string;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  operationalStatus?: OperationalStatus;
  /** ISO currency code for this booking (INR, AED, …). */
  currency?: string;
  propertyReference?: string;
  /** Total ÷ nights — may include tax/discounts/extras. */
  averageNightlyTotal?: string;
  expiresAt?: string;
  policyId?: string;
  specialRequests?: string;
  dietaryNeeds?: string;
  checkInStatus: CheckInOutStatus;
  checkedInAt?: string;
  checkedOutAt?: string;
  refundStatus: RefundStatus;
  refundAmount?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  disputeStatus: DisputeStatus;
  disputeSummary?: string;
  disputeGuestClaim?: string;
  disputeHostResponse?: string;
  disputeResolution?: string;
  disputeOpenedAt?: string;
  disputeResolvedAt?: string;
  noShow?: boolean;
  auditLog: BookingAuditEntry[];
}

export type HostBookingUpdate = Partial<
  Pick<
    HostBookingRecord,
    | "status"
    | "expiresAt"
    | "policyId"
    | "checkInStatus"
    | "checkedInAt"
    | "checkedOutAt"
    | "refundStatus"
    | "refundAmount"
    | "cancellationReason"
    | "cancelledAt"
    | "paymentStatus"
    | "disputeStatus"
    | "disputeSummary"
    | "disputeGuestClaim"
    | "disputeHostResponse"
    | "disputeResolution"
    | "disputeOpenedAt"
    | "disputeResolvedAt"
    | "noShow"
    | "auditLog"
  >
>;

export type { HostBookingStatus };
