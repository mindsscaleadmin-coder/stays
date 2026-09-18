import { describe, expect, it } from "vitest";
import { resolveTimezoneFromCountry } from "./operational-timezone";

describe("operational-timezone", () => {
  it("resolves from ISO2", () => {
    expect(resolveTimezoneFromCountry({ iso2: "IN" })).toBe("Asia/Kolkata");
    expect(resolveTimezoneFromCountry({ iso2: "AE" })).toBe("Asia/Dubai");
  });

  it("resolves from country name", () => {
    expect(resolveTimezoneFromCountry({ countryName: "India" })).toBe("Asia/Kolkata");
    expect(resolveTimezoneFromCountry({ countryName: "United Arab Emirates" })).toBe("Asia/Dubai");
  });

  it("prefers database timezone when set", () => {
    expect(
      resolveTimezoneFromCountry({
        iso2: "IN",
        dbTimezone: "Asia/Calcutta",
      })
    ).toBe("Asia/Calcutta");
  });
});
