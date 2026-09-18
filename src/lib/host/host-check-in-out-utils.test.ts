import { describe, expect, it } from "vitest";
import {
  arrivalStatusLabel,
  countNeedsAction,
  departureStatusLabel,
  filterStayCheckInOutBookings,
  isStayCheckInOutBooking,
} from "./host-check-in-out-utils";
import type { HostBookingRecord } from "./host-booking-types";

function stay(overrides: Partial<HostBookingRecord> = {}): HostBookingRecord {
  return {
    id: "bk-1",
    guest: "Guest",
    property: "Cabin",
    roomType: "Double",
    checkIn: "2026-09-18",
    checkOut: "2026-09-20",
    status: "confirmed",
    paymentStatus: "Paid",
    checkInStatus: "pending",
    refundStatus: "none",
    disputeStatus: "none",
    auditLog: [],
    bookedAt: "2026-09-01",
    total: "AED 500",
    nights: 2,
    guests: 2,
    ...overrides,
  } as HostBookingRecord;
}

describe("host-check-in-out-utils", () => {
  it("filters stay bookings only", () => {
    const rows = [
      stay(),
      stay({ id: "exp-1", category: "experience" }),
      stay({ id: "evt-1", opsSourceType: "event_request" }),
    ];
    expect(filterStayCheckInOutBookings(rows)).toHaveLength(1);
    expect(isStayCheckInOutBooking(stay({ category: "experience" }))).toBe(false);
  });

  it("labels arrival states", () => {
    expect(arrivalStatusLabel(stay()).label).toBe("Awaiting check-in");
    expect(arrivalStatusLabel(stay({ noShow: true })).label).toBe("No-show");
    expect(arrivalStatusLabel(stay({ checkInStatus: "checked_in", checkedInAt: "2026-09-18T10:30:00Z" })).tone).toBe(
      "success"
    );
    expect(
      arrivalStatusLabel(
        stay({ checkInStatus: "checked_in", checkInSource: "auto", checkedInAt: "2026-09-18T11:00:00Z" })
      ).label
    ).toContain("Auto checked in");
  });

  it("labels departure states", () => {
    expect(departureStatusLabel(stay()).label).toBe("Awaiting check-out");
    expect(
      departureStatusLabel(stay({ checkInStatus: "checked_out", checkedOutAt: "2026-09-20T08:00:00Z" })).tone
    ).toBe("success");
  });

  it("counts actions needed", () => {
    const arrivals = [stay(), stay({ id: "bk-2", noShow: true })];
    const departures = [stay({ id: "bk-3", checkOut: "2026-09-18" })];
    expect(countNeedsAction(arrivals, departures)).toBe(2);
  });
});
