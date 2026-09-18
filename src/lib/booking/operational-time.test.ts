import { describe, expect, it } from "vitest";
import {
  canAutoCheckInNow,
  dateIsoInTimezone,
  hasReachedOperationalTime,
  parseTimeToMinutes,
} from "./operational-time";
import { DEFAULT_OPERATIONAL_SETTINGS } from "@/lib/host/operational-settings-data";

describe("operational-time", () => {
  it("parses HH:mm to minutes", () => {
    expect(parseTimeToMinutes("15:00")).toBe(900);
    expect(parseTimeToMinutes("11:30")).toBe(690);
  });

  it("formats date in timezone", () => {
    const noonUtc = new Date("2026-09-18T12:00:00Z");
    expect(dateIsoInTimezone(noonUtc, "Asia/Dubai")).toBe("2026-09-18");
  });

  it("detects operational time reached", () => {
    const atThree = new Date("2026-09-18T11:00:00Z"); // 15:00 in Dubai (UTC+4)
    expect(hasReachedOperationalTime(atThree, "15:00", "Asia/Dubai")).toBe(true);
    expect(hasReachedOperationalTime(atThree, "16:00", "Asia/Dubai")).toBe(false);
  });

  it("auto check-in runs at no-show cutoff (default 5 PM)", () => {
    const settings = { ...DEFAULT_OPERATIONAL_SETTINGS, timezone: "Asia/Dubai" };
    const atThree = new Date("2026-09-18T11:00:00Z"); // 15:00 Dubai
    expect(canAutoCheckInNow(atThree, settings)).toBe(false);
    const atFive = new Date("2026-09-18T13:00:00Z"); // 17:00 Dubai
    expect(canAutoCheckInNow(atFive, settings)).toBe(true);
  });
});
