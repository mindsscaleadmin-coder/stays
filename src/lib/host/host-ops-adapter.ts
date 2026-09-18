import type { EventAvailabilityRequest } from "@/lib/events/event-availability-types";
import type { HostBookingCategory } from "@/lib/host/booking-category";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { HostBookingOpsRecord, HostOpsSourceType } from "@/lib/host/host-ops-types";
import {
  operationalStatusForEventRequest,
} from "@/lib/host/operational-status";
import { defaultCheckInStatus, defaultRefundStatus } from "@/lib/host/host-booking-utils";

export function isEventOpsRecord(booking: HostBookingRecord): boolean {
  return booking.opsSourceType === "event_request";
}

export function hostBookingDetailPath(booking: HostBookingRecord): string {
  if (isEventOpsRecord(booking)) {
    return `/host/bookings/event/${encodeURIComponent(booking.id)}`;
  }
  return `/host/bookings/${encodeURIComponent(booking.id)}`;
}

function mapEventStatusToBookingStatus(
  status: EventAvailabilityRequest["status"]
): HostBookingRecord["status"] {
  if (status === "available") return "confirmed";
  if (status === "unavailable") return "cancelled";
  return "pending";
}

/** Normalize a confirmed dining/event enquiry into the shared host ops list shape. */
export function eventRequestToHostBookingRecord(
  request: EventAvailabilityRequest,
  category: HostBookingCategory,
  options?: {
    propertyLocation?: string;
    propertyReference?: string;
    ops?: HostBookingOpsRecord | null;
  }
): HostBookingRecord {
  const eventDate = request.eventDate ?? request.createdAt.slice(0, 10);
  const ops = options?.ops ?? null;

  return {
    id: request.id,
    opsSourceType: "event_request",
    guest: request.guestName,
    guestEmail: request.guestEmail ?? "",
    guestPhone: request.guestPhone ?? "",
    guestCountry: "",
    guestNotes: request.message ?? "",
    property: request.listingTitle,
    propertyLocation: options?.propertyLocation ?? "",
    propertyReference: options?.propertyReference,
    roomType: request.spaceName || request.occasion || request.partyType || "Enquiry",
    checkIn: eventDate,
    checkOut: eventDate,
    nights: 1,
    guests: request.guestCount,
    adults: request.guestCount,
    children: 0,
    nightlyRate: "—",
    cleaningFee: "—",
    serviceFee: "—",
    total: "Enquiry",
    paymentStatus: "Enquiry",
    paymentMethod: "—",
    bookedAt: request.createdAt,
    status: mapEventStatusToBookingStatus(request.status),
    bookingReference: request.id,
    hostId: request.hostId,
    listingId: request.listingId,
    guestId: request.guestId,
    category,
    specialRequests: request.message,
    eventOccasion: request.occasion,
    eventPartyType: request.partyType,
    eventSpaceName: request.spaceName,
    dateFlexible: request.dateFlexible,
    hostNote: request.hostNote,
    eventEnquiryStatus: request.status,
    eventRespondedAt: request.respondedAt,
    checkInStatus: defaultCheckInStatus(mapEventStatusToBookingStatus(request.status)),
    refundStatus: defaultRefundStatus(mapEventStatusToBookingStatus(request.status)),
    disputeStatus: "none",
    auditLog: [],
    assignedStaffId: ops?.assignedStaffId ?? null,
    operationalStatus: operationalStatusForEventRequest({
      status: request.status,
      eventDate: request.eventDate ?? null,
      dateFlexible: Boolean(request.dateFlexible),
      opsCompletedAt: ops?.completedAt,
    }),
  };
}

export function opsSourceForRecord(booking: HostBookingRecord): {
  sourceType: HostOpsSourceType;
  sourceId: string;
} {
  return {
    sourceType: booking.opsSourceType ?? "booking",
    sourceId: booking.id,
  };
}
