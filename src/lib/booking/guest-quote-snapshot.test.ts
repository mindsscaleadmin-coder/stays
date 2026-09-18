import { describe, expect, it } from "vitest";
import {
  buildGuestQuoteSnapshot,
  parseGuestQuoteSnapshot,
  serializeGuestQuoteSnapshot,
} from "./guest-quote-snapshot";

describe("guestQuoteSnapshot", () => {
  it("round-trips serialize and parse", () => {
    const snapshot = buildGuestQuoteSnapshot({
      currency: "INR",
      inclusiveTotal: 1180,
      taxAmount: 180,
      taxLabel: "GST",
      taxPct: 18,
    });
    const parsed = parseGuestQuoteSnapshot(serializeGuestQuoteSnapshot(snapshot));
    expect(parsed).toEqual(snapshot);
  });

  it("uses consistent tax label fields", () => {
    const snapshot = buildGuestQuoteSnapshot({
      currency: "INR",
      inclusiveTotal: 1180,
      taxAmount: 180,
      taxLabel: "GST",
      taxPct: 18,
    });
    expect(snapshot.propertyRate).toBe(1180);
    expect(snapshot.total).toBe(1180);
    expect(snapshot.taxLabel).toBe("GST");
  });
});
