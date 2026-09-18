import { describe, expect, it } from "vitest";
import {
  eventRequestToHostBookingRecord,
  hostBookingDetailPath,
  isEventOpsRecord,
} from "./host-ops-adapter";
import type { EventAvailabilityRequest } from "@/lib/events/event-availability-types";

const baseRequest: EventAvailabilityRequest = {
  id: "EVR-TEST-1",
  listingId: "listing-1",
  listingTitle: "Farm Banquet Hall",
  hostId: "host-1",
  guestId: "guest-1",
  guestName: "Priya Sharma",
  guestEmail: "priya@example.com",
  guestPhone: "+91 90000 00000",
  occasion: "Wedding",
  partyType: "Private",
  eventDate: "2026-10-05",
  dateFlexible: false,
  guestCount: 120,
  message: "Need vegetarian menu",
  status: "available",
  createdAt: "2026-09-01T10:00:00.000Z",
  respondedAt: "2026-09-02T12:00:00.000Z",
  hostNote: "Date confirmed",
};

describe("eventRequestToHostBookingRecord", () => {
  it("maps available enquiries to confirmed ops rows", () => {
    const row = eventRequestToHostBookingRecord(baseRequest, "event");
    expect(row.opsSourceType).toBe("event_request");
    expect(row.status).toBe("confirmed");
    expect(row.checkIn).toBe("2026-10-05");
    expect(row.paymentStatus).toBe("Enquiry");
    expect(isEventOpsRecord(row)).toBe(true);
  });
});

describe("hostBookingDetailPath", () => {
  it("routes event enquiries to the event detail page", () => {
    const row = eventRequestToHostBookingRecord(baseRequest, "dining");
    expect(hostBookingDetailPath(row)).toBe("/host/bookings/event/EVR-TEST-1");
  });
});
