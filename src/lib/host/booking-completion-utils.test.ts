import { describe, expect, it } from "vitest";
import {
  canHostCheckIn,
  canHostMarkCompleted,
  showReviewRequestNudge,
} from "./booking-completion-utils";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";

const base: HostBookingRecord = {
  id: "b1",
  guest: "Guest",
  guestEmail: "",
  guestPhone: "",
  guestCountry: "",
  guestNotes: "",
  property: "Farm",
  propertyLocation: "",
  roomType: "Room",
  checkIn: "2026-10-25",
  checkOut: "2026-10-27",
  nights: 2,
  guests: 2,
  adults: 2,
  children: 0,
  nightlyRate: "AED 100",
  cleaningFee: "AED 0",
  serviceFee: "AED 0",
  total: "AED 200",
  paymentStatus: "Paid",
  paymentMethod: "Checkout",
  bookedAt: "2026-10-01",
  status: "confirmed",
  checkInStatus: "pending",
  refundStatus: "none",
  disputeStatus: "none",
  auditLog: [],
  category: "stay",
};

describe("canHostCheckIn", () => {
  it("allows stay check-in when confirmed and paid", () => {
    expect(canHostCheckIn(base, "ongoing")).toBe(true);
  });

  it("disallows experience check-in", () => {
    expect(canHostCheckIn({ ...base, category: "experience" }, "ongoing")).toBe(false);
  });
});

describe("canHostMarkCompleted", () => {
  it("allows experience completion on or after session date", () => {
    expect(
      canHostMarkCompleted(
        { ...base, category: "experience", checkIn: "2026-10-25", checkOut: "2026-10-25" },
        "2026-10-25"
      )
    ).toBe(true);
  });
});

describe("showReviewRequestNudge", () => {
  it("shows after completed status", () => {
    expect(showReviewRequestNudge({ ...base, status: "completed" })).toBe(true);
  });
});
