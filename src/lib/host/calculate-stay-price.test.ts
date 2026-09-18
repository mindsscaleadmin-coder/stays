import { describe, expect, it } from "vitest";
import { calculateStayQuote } from "./calculate-stay-price";
import type { ListingPricingSettings } from "./host-pricing-types";

function baseSettings(
  overrides?: Partial<ListingPricingSettings>
): ListingPricingSettings {
  return {
    listingId: "L-test",
    basePrice: 1000,
    currency: "INR",
    weekendPrice: null,
    monthlyPrice: null,
    roomPrices: [],
    seasonalPricing: [],
    weeklyDiscountPct: 0,
    monthlyDiscountPct: 0,
    earlyBirdDiscountPct: 0,
    earlyBirdDaysAhead: 30,
    lastMinuteDiscountPct: 0,
    lastMinuteDaysAhead: 3,
    flashDealEnabled: false,
    flashDealDiscountPct: 0,
    flashDealEndsAt: null,
    extraCharges: [],
    extraGuestCharge: 0,
    guestsIncludedInBase: 2,
    seasonalEnabled: true,
    discountsEnabled: true,
    extraChargesEnabled: true,
    taxPct: 18,
    taxLabel: "GST",
    sessions: [],
    ...overrides,
  };
}

describe("calculateStayQuote", () => {
  it("extracts inclusive GST without adding tax to total", () => {
    const quote = calculateStayQuote({
      settings: baseSettings(),
      checkIn: "2026-10-01",
      checkOut: "2026-10-03",
      guests: 2,
    });
    expect(quote).not.toBeNull();
    expect(quote!.total).toBe(2000);
    expect(quote!.taxAmount).toBe(305);
    expect(quote!.taxAmount + (quote!.total - quote!.taxAmount)).toBe(quote!.total);
    expect(quote!.lines.some((l) => l.label.includes("GST") && l.label.includes("included"))).toBe(
      true
    );
  });

  it("applies extra-guest charge per night above guests included in base", () => {
    const quote = calculateStayQuote({
      settings: baseSettings({ extraGuestCharge: 500, guestsIncludedInBase: 2 }),
      checkIn: "2026-10-01",
      checkOut: "2026-10-03",
      guests: 3,
    });
    expect(quote!.extraGuestTotal).toBe(1000);
    expect(quote!.total).toBe(3000);
    expect(quote!.lines.some((l) => l.label.startsWith("Extra guests"))).toBe(true);
  });

  it("applies stay discount before tax extraction", () => {
    const quote = calculateStayQuote({
      settings: baseSettings({ weeklyDiscountPct: 10 }),
      checkIn: "2026-10-01",
      checkOut: "2026-10-08",
      guests: 2,
    });
    expect(quote!.nights).toBe(7);
    expect(quote!.discountAmount).toBe(700);
    expect(quote!.total).toBe(6300);
    expect(quote!.taxAmount).toBe(Math.round((6300 * 18) / 118));
  });

  it("sums nightly rates across multiple selected rooms", () => {
    const quote = calculateStayQuote({
      settings: baseSettings({
        basePrice: 0,
        roomPrices: [
          { roomId: "r1", basePrice: 800, weekendPrice: null, monthlyPrice: null },
          { roomId: "r2", basePrice: 600, weekendPrice: null, monthlyPrice: null },
        ],
      }),
      checkIn: "2026-10-01",
      checkOut: "2026-10-02",
      guests: 2,
      roomIds: ["r1", "r2"],
    });
    expect(quote!.accommodationSubtotal).toBe(1400);
    expect(quote!.total).toBe(1400);
  });
});
