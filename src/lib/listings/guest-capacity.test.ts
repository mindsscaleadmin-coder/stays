import { describe, expect, it } from "vitest";
import {
  payingGuestsCapacity,
  readGuestPartyFromFilters,
  writeGuestPartyFilters,
} from "./guest-capacity";

describe("guest-capacity", () => {
  it("reads total guests and per-type maxes from filters", () => {
    const party = readGuestPartyFromFilters([
      { label: "Adults", value: "3" },
      { label: "Children", value: "2" },
      { label: "Infants", value: "1" },
      { label: "Guests", value: "4" },
    ]);
    expect(party).toEqual({ adults: 3, children: 2, infants: 1, total: 4 });
    expect(payingGuestsCapacity(party)).toBe(4);
  });

  it("lets guests freely mix when only a total is stored", () => {
    const party = readGuestPartyFromFilters([{ label: "Guests", value: "5" }]);
    expect(party).toEqual({ adults: 5, children: 5, infants: 5, total: 5 });
  });

  it("writes total plus max breakdown", () => {
    const next = writeGuestPartyFilters(
      [{ label: "Beds", value: "2" }],
      { adults: 3, children: 2, infants: 1, total: 4 }
    );
    expect(next).toEqual([
      { label: "Beds", value: "2" },
      { label: "Adults", value: "3" },
      { label: "Children", value: "2" },
      { label: "Infants", value: "1" },
      { label: "Guests", value: "4" },
    ]);
  });
});
