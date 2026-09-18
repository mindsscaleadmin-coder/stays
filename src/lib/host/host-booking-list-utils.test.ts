import { describe, expect, it } from "vitest";
import {
  filterBookingsByOperationalStatus,
  formatBookingListDates,
  formatNextSevenDaysMeta,
  resolveBookingOperationalStatus,
} from "./host-booking-list-utils";
import type { HostBookingRecord } from "./host-booking-types";

function booking(overrides: Partial<HostBookingRecord> = {}): HostBookingRecord {
  return {
    id: "b1",
    guest: "Alex",
    guestEmail: "alex@example.com",
    guestPhone: "+971 50 000 0000",
    guestCountry: "United Arab Emirates",
    guestNotes: "",
    property: "Farm Stay",
    propertyLocation: "Al Ain",
    checkIn: "2026-09-20",
    checkOut: "2026-09-22",
    nights: 2,
    guests: 2,
    adults: 2,
    children: 0,
    nightlyRate: "₹2,000",
    cleaningFee: "₹0",
    serviceFee: "₹0",
    status: "confirmed",
    total: "₹4,000",
    bookedAt: "2026-09-01",
    roomType: "Cottage",
    paymentStatus: "paid",
    paymentMethod: "card",
    checkInStatus: "pending",
    refundStatus: "none",
    disputeStatus: "none",
    auditLog: [],
    ...overrides,
  };
}

describe("resolveBookingOperationalStatus", () => {
  it("prefers server-provided operationalStatus", () => {
    expect(
      resolveBookingOperationalStatus(
        booking({ operationalStatus: "in_progress", status: "confirmed" })
      )
    ).toBe("in_progress");
  });
});

describe("filterBookingsByOperationalStatus", () => {
  it("filters by operational status", () => {
    const rows = [
      booking({ id: "a", operationalStatus: "upcoming" }),
      booking({ id: "b", operationalStatus: "completed" }),
    ];
    expect(filterBookingsByOperationalStatus(rows, "upcoming")).toHaveLength(1);
    expect(filterBookingsByOperationalStatus(rows, "")).toHaveLength(2);
  });
});

describe("formatBookingListDates", () => {
  it("formats experience session label", () => {
    expect(
      formatBookingListDates(
        booking({
          category: "experience",
          experienceSessionLabel: "10:00 AM",
          checkIn: "2026-09-20",
          checkOut: "2026-09-20",
        })
      )
    ).toContain("10:00 AM");
  });
});

describe("formatNextSevenDaysMeta", () => {
  it("includes category and guest count", () => {
    const meta = formatNextSevenDaysMeta(booking({ category: "stay" }));
    expect(meta).toContain("Stay");
    expect(meta).toContain("2 guests");
  });
});
