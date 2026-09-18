import { describe, expect, it } from "vitest";
import {
  bookingNumberWithHost,
  ordinalWithHost,
  summarizeGuestBookings,
} from "./customer-history-utils";

const rows = [
  {
    id: "b1",
    property: "Farm A",
    checkIn: "2026-08-01",
    checkOut: "2026-08-03",
    status: "completed",
    bookedAt: "2026-07-01",
  },
  {
    id: "b2",
    property: "Farm B",
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
    status: "completed",
    bookedAt: "2026-08-01",
  },
  {
    id: "b3",
    property: "Farm C",
    checkIn: "2026-11-01",
    checkOut: "2026-11-03",
    status: "confirmed",
    bookedAt: "2026-10-01",
  },
];

describe("bookingNumberWithHost", () => {
  it("returns chronological index for current booking", () => {
    expect(bookingNumberWithHost(rows, "b2")).toBe(2);
    expect(bookingNumberWithHost(rows, "b3")).toBe(3);
  });
});

describe("ordinalWithHost", () => {
  it("formats ordinals", () => {
    expect(ordinalWithHost(1)).toBe("1st");
    expect(ordinalWithHost(3)).toBe("3rd");
    expect(ordinalWithHost(11)).toBe("11th");
  });
});

describe("summarizeGuestBookings", () => {
  it("counts totals and recent bookings excluding current", () => {
    const summary = summarizeGuestBookings("guest-1", rows, "b3", "2026-10-25");
    expect(summary.totalBookings).toBe(3);
    expect(summary.completedBookings).toBe(2);
    expect(summary.upcomingBookings).toBe(1);
    expect(summary.bookingNumberWithHost).toBe(3);
    expect(summary.recentBookings.map((r) => r.id)).toEqual(["b2", "b1"]);
  });
});
