import { describe, expect, it } from "vitest";
import {
  formatExperienceSessionLabel,
  resolveHostBookingCategory,
} from "./booking-category";

describe("resolveHostBookingCategory", () => {
  it("detects experience from slot id", () => {
    expect(
      resolveHostBookingCategory({
        experienceSlotId: "slot-1",
        parentCategory: "Stays",
      })
    ).toBe("experience");
  });

  it("detects stay by default", () => {
    expect(
      resolveHostBookingCategory({
        parentCategory: "Stays",
        category: "farmstay",
      })
    ).toBe("stay");
  });

  it("detects dining from parent category", () => {
    expect(
      resolveHostBookingCategory({
        parentCategory: "Dining",
      })
    ).toBe("dining");
  });

  it("detects event from category", () => {
    expect(
      resolveHostBookingCategory({
        parentCategory: "Events",
        category: "venue",
      })
    ).toBe("event");
  });
});

describe("formatExperienceSessionLabel", () => {
  it("formats session keys for display", () => {
    expect(formatExperienceSessionLabel("morning")).toBe("Morning");
    expect(formatExperienceSessionLabel("sunset_session")).toBe("Sunset Session");
  });
});
