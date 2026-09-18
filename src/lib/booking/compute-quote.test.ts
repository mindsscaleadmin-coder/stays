import { describe, expect, it } from "vitest";
import { computeBookingQuote } from "./compute-quote";
import { BASE_CURRENCY } from "@/lib/currency";

describe("computeBookingQuote", () => {
  it("tax is informational only; total excludes double-counting", () => {
    const quote = computeBookingQuote({
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guestCount: 2,
      accommodation: 900,
      experiencesTotal: 100,
      extrasTotal: 50,
      taxAmount: 50,
      currency: "INR",
    });
    expect(quote.nights).toBe(3);
    expect(quote.total).toBe(1050);
    expect(quote.currency).toBe("INR");
    expect(quote.lines).toHaveLength(4);
  });

  it("defaults currency to platform baseline", () => {
    const quote = computeBookingQuote({
      checkIn: "2026-10-01",
      checkOut: "2026-10-02",
      guestCount: 1,
      accommodation: 200,
    });
    expect(quote.currency).toBe(BASE_CURRENCY);
  });

  it("rejects invalid date range", () => {
    expect(() =>
      computeBookingQuote({
        checkIn: "2026-10-02",
        checkOut: "2026-10-02",
        guestCount: 1,
        accommodation: 100,
      })
    ).toThrow(/check-out/i);
  });

  it("rejects invalid guest count", () => {
    expect(() =>
      computeBookingQuote({
        checkIn: "2026-10-01",
        checkOut: "2026-10-02",
        guestCount: 0,
        accommodation: 100,
      })
    ).toThrow(/guest/i);
  });

  it("clamps negative line items to zero", () => {
    const quote = computeBookingQuote({
      checkIn: "2026-10-01",
      checkOut: "2026-10-02",
      guestCount: 1,
      accommodation: -50,
      experiencesTotal: -10,
    });
    expect(quote.accommodation).toBe(0);
    expect(quote.experiencesTotal).toBe(0);
    expect(quote.total).toBe(0);
  });
});
