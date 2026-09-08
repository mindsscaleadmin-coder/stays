import { describe, expect, it } from "vitest";
import { stayNightDates } from "./stay-night-dates";

describe("stayNightDates", () => {
  it("returns each night between check-in and check-out", () => {
    const nights = stayNightDates(
      new Date("2026-10-01T00:00:00Z"),
      new Date("2026-10-04T00:00:00Z")
    );
    expect(nights).toHaveLength(3);
    expect(nights.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });

  it("returns empty when check-out is not after check-in", () => {
    expect(
      stayNightDates(new Date("2026-10-01T12:00:00"), new Date("2026-10-01T12:00:00"))
    ).toHaveLength(0);
  });
});
