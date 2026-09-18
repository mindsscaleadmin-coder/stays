import { describe, expect, it } from "vitest";
import {
  canAutoCheckInNow,
  isArrivalDay,
  isDepartureDay,
} from "./operational-time";
import { DEFAULT_OPERATIONAL_SETTINGS } from "@/lib/host/operational-settings-data";

describe("operational-sync eligibility", () => {
  const settings = { ...DEFAULT_OPERATIONAL_SETTINGS, timezone: "Asia/Dubai" };
  const checkIn = new Date("2026-09-18T00:00:00.000Z");
  const checkOut = new Date("2026-09-20T00:00:00.000Z");

  it("matches arrival day in host timezone", () => {
    const afternoon = new Date("2026-09-18T11:00:00.000Z"); // 15:00 Dubai
    expect(isArrivalDay(checkIn, afternoon, settings)).toBe(true);
    expect(canAutoCheckInNow(afternoon, settings)).toBe(false);
    const evening = new Date("2026-09-18T13:00:00.000Z"); // 17:00 Dubai
    expect(canAutoCheckInNow(evening, settings)).toBe(true);
  });

  it("matches departure day in host timezone", () => {
    const morning = new Date("2026-09-20T07:00:00.000Z"); // 11:00 Dubai
    expect(isDepartureDay(checkOut, morning, settings)).toBe(true);
  });
});
