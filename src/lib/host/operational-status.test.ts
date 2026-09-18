import { describe, expect, it } from "vitest";
import {
  operationalStatusForBooking,
  operationalStatusForEventRequest,
  operationalStatusLabel,
  todayIso,
} from "./operational-status";

describe("todayIso", () => {
  it("returns UTC calendar date as YYYY-MM-DD", () => {
    expect(todayIso(new Date("2026-10-25T23:30:00.000Z"))).toBe("2026-10-25");
    expect(todayIso(new Date("2026-10-26T00:30:00.000Z"))).toBe("2026-10-26");
  });
});

describe("operationalStatusForBooking", () => {
  const today = "2026-10-25";

  it("maps cancelled, declined, and expired to cancelled", () => {
    expect(
      operationalStatusForBooking(
        { status: "cancelled", checkIn: "2026-11-01", checkOut: "2026-11-03" },
        today
      )
    ).toBe("cancelled");
    expect(
      operationalStatusForBooking(
        { status: "declined", checkIn: "2026-11-01", checkOut: "2026-11-03" },
        today
      )
    ).toBe("cancelled");
    expect(
      operationalStatusForBooking(
        { status: "expired", checkIn: "2026-11-01", checkOut: "2026-11-03" },
        today
      )
    ).toBe("cancelled");
  });

  it("maps completed status and opsCompletedAt to completed", () => {
    expect(
      operationalStatusForBooking(
        { status: "completed", checkIn: "2026-10-20", checkOut: "2026-10-22" },
        today
      )
    ).toBe("completed");
    expect(
      operationalStatusForBooking(
        {
          status: "confirmed",
          checkIn: "2026-11-01",
          checkOut: "2026-11-03",
          opsCompletedAt: "2026-10-20T12:00:00.000Z",
        },
        today
      )
    ).toBe("completed");
  });

  it("maps confirmed stay with past check-out to completed", () => {
    expect(
      operationalStatusForBooking(
        { status: "confirmed", checkIn: "2026-10-20", checkOut: "2026-10-22" },
        today
      )
    ).toBe("completed");
  });

  it("maps in-stay window to in_progress", () => {
    expect(
      operationalStatusForBooking(
        { status: "confirmed", checkIn: "2026-10-24", checkOut: "2026-10-26" },
        today
      )
    ).toBe("in_progress");
  });

  it("maps future confirmed stay to upcoming", () => {
    expect(
      operationalStatusForBooking(
        { status: "confirmed", checkIn: "2026-11-01", checkOut: "2026-11-03" },
        today
      )
    ).toBe("upcoming");
  });

  it("maps same-day experience (checkIn === checkOut) on event day to in_progress", () => {
    expect(
      operationalStatusForBooking(
        { status: "confirmed", checkIn: "2026-10-25", checkOut: "2026-10-25" },
        today
      )
    ).toBe("in_progress");
  });

  it("maps same-day experience after event day to completed", () => {
    expect(
      operationalStatusForBooking(
        { status: "confirmed", checkIn: "2026-10-24", checkOut: "2026-10-24" },
        today
      )
    ).toBe("completed");
  });

  it("maps pending future booking to upcoming", () => {
    expect(
      operationalStatusForBooking(
        { status: "pending", checkIn: "2026-11-10", checkOut: "2026-11-12" },
        today
      )
    ).toBe("upcoming");
  });
});

describe("operationalStatusForEventRequest", () => {
  const today = "2026-10-25";

  it("maps unavailable to cancelled", () => {
    expect(
      operationalStatusForEventRequest(
        { status: "unavailable", eventDate: "2026-11-01", dateFlexible: false },
        today
      )
    ).toBe("cancelled");
  });

  it("maps available future dated event to upcoming", () => {
    expect(
      operationalStatusForEventRequest(
        { status: "available", eventDate: "2026-11-01", dateFlexible: false },
        today
      )
    ).toBe("upcoming");
  });

  it("maps available event on today to in_progress", () => {
    expect(
      operationalStatusForEventRequest(
        { status: "available", eventDate: "2026-10-25", dateFlexible: false },
        today
      )
    ).toBe("in_progress");
  });

  it("maps available past event to completed", () => {
    expect(
      operationalStatusForEventRequest(
        { status: "available", eventDate: "2026-10-20", dateFlexible: false },
        today
      )
    ).toBe("completed");
  });

  it("maps opsCompletedAt on available enquiry to completed", () => {
    expect(
      operationalStatusForEventRequest(
        {
          status: "available",
          eventDate: "2026-11-01",
          dateFlexible: false,
          opsCompletedAt: "2026-10-25T10:00:00.000Z",
        },
        today
      )
    ).toBe("completed");
  });

  it("maps available flexible date to confirmed", () => {
    expect(
      operationalStatusForEventRequest(
        { status: "available", eventDate: null, dateFlexible: true },
        today
      )
    ).toBe("confirmed");
  });

  it("maps pending enquiry to confirmed (pre-confirmation)", () => {
    expect(
      operationalStatusForEventRequest(
        { status: "pending", eventDate: "2026-11-01", dateFlexible: false },
        today
      )
    ).toBe("confirmed");
  });
});

describe("operationalStatusLabel", () => {
  it("returns human-readable labels", () => {
    expect(operationalStatusLabel("in_progress")).toBe("In Progress");
    expect(operationalStatusLabel("upcoming")).toBe("Upcoming");
  });
});
