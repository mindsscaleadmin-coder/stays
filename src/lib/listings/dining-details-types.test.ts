import { describe, expect, it } from "vitest";
import {
  buildDiningReservationTimeGroups,
  createEmptyDiningDetails,
  formatDayHoursSummary,
  formatPriceLevel,
  hasDiningIndicativePricing,
  hasDiningMenu,
  hydrateDiningDetails,
  migrateLegacyDayHours,
  normalizeDiningDetails,
  occasionToMealPeriod,
} from "./dining-details-types";

describe("dining-details-types", () => {
  it("normalizes empty dining details to undefined", () => {
    expect(normalizeDiningDetails(createEmptyDiningDetails())).toBeUndefined();
  });

  it("detects indicative pricing from price level or average spend", () => {
    expect(hasDiningIndicativePricing(undefined)).toBe(false);
    expect(hasDiningIndicativePricing({ priceLevel: 2 })).toBe(true);
    expect(hasDiningIndicativePricing({ averagePriceMin: 120 })).toBe(true);
  });

  it("keeps price level and menu sections", () => {
    const normalized = normalizeDiningDetails({
      priceLevel: 3,
      menuSections: [{ name: "Starters", items: [{ name: "Soup", price: 45 }] }],
    });
    expect(normalized?.priceLevel).toBe(3);
    expect(hasDiningMenu(normalized)).toBe(true);
    expect(formatPriceLevel(3)).toBe("$$$");
  });

  it("migrates legacy opening hours into meal periods", () => {
    const periods = migrateLegacyDayHours({
      day: "sat",
      open: "10:00 AM",
      close: "3:00 PM",
      note: "Brunch",
    });
    const brunch = periods.find((period) => period.meal === "brunch");
    expect(brunch?.open).toBe("10:00 AM");
    expect(brunch?.close).toBe("3:00 PM");
  });

  it("normalizes meal-period opening hours", () => {
    const normalized = normalizeDiningDetails({
      openingHours: [
        {
          day: "fri",
          periods: [
            { meal: "lunch", open: "12:00 PM", close: "3:00 PM" },
            { meal: "dinner", open: "6:00 PM", close: "11:00 PM" },
          ],
        },
      ],
    });
    expect(normalized?.openingHours?.[0]?.periods).toHaveLength(2);
    expect(formatDayHoursSummary(normalized!.openingHours![0])).toBe(
      "Lunch 12:00 PM – 3:00 PM · Dinner 6:00 PM – 11:00 PM"
    );
  });

  it("hydrates legacy opening hours for editing", () => {
    const hydrated = hydrateDiningDetails({
      openingHours: [{ day: "sun", open: "8:00 AM", close: "11:00 AM", note: "Breakfast" }],
    });
    const breakfast = hydrated.openingHours?.[6]?.periods?.find(
      (period) => period.meal === "breakfast"
    );
    expect(breakfast?.open).toBe("8:00 AM");
    expect(breakfast?.close).toBe("11:00 AM");
  });

  it("maps dining occasions to meal periods", () => {
    expect(occasionToMealPeriod("Dinner")).toBe("dinner");
    expect(occasionToMealPeriod("Birthday dinner")).toBe("dinner");
    expect(occasionToMealPeriod("Business lunch")).toBe("lunch");
    expect(occasionToMealPeriod("Anniversary")).toBeUndefined();
  });

  it("builds reservation slots from meal-period hours for a selected date", () => {
    const details = normalizeDiningDetails({
      openingHours: [
        {
          day: "fri",
          periods: [
            { meal: "lunch", open: "12:00 PM", close: "2:00 PM" },
            { meal: "dinner", open: "6:00 PM", close: "8:00 PM" },
          ],
        },
      ],
    });
    const groups = buildDiningReservationTimeGroups(details, { isoDate: "2026-09-18" });
    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBe("Lunch");
    expect(groups[0]?.hoursLabel).toBe("12:00 PM – 2:00 PM");
    expect(groups[0]?.times).toEqual([
      "12:00 PM",
      "12:30 PM",
      "1:00 PM",
      "1:30 PM",
      "2:00 PM",
    ]);
    expect(groups[1]?.label).toBe("Dinner");
    expect(groups[1]?.hoursLabel).toBe("6:00 PM – 8:00 PM");
    expect(groups[1]?.times).toEqual([
      "6:00 PM",
      "6:30 PM",
      "7:00 PM",
      "7:30 PM",
      "8:00 PM",
    ]);
  });

  it("includes the closing time as the last reservation slot", () => {
    const details = normalizeDiningDetails({
      openingHours: [
        {
          day: "wed",
          periods: [{ meal: "dinner", open: "6:00 PM", close: "10:30 PM" }],
        },
      ],
    });
    const groups = buildDiningReservationTimeGroups(details, { isoDate: "2026-09-16" });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.times.at(-1)).toBe("10:30 PM");
    expect(groups[0]?.times).toContain("8:30 PM");
  });

  it("normalizes featured dishes and reservation fields", () => {
    const normalized = normalizeDiningDetails({
      primaryCuisine: "Italian",
      featuredDishes: [{ name: "Truffle pasta", price: 85, isSignature: true }],
      reservationRequired: true,
      depositRequired: true,
      depositAmount: 100,
      seatingOptions: ["Indoor", "Terrace"],
    });
    expect(normalized?.primaryCuisine).toBe("Italian");
    expect(normalized?.featuredDishes?.[0]?.name).toBe("Truffle pasta");
    expect(normalized?.reservationRequired).toBe(true);
    expect(normalized?.depositAmount).toBe(100);
    expect(normalized?.seatingOptions).toEqual(["Indoor", "Terrace"]);
  });
});
