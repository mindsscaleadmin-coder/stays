import { describe, expect, it } from "vitest";
import {
  applyMarketStatus,
  countLiveCountries,
  getCountryMarketStatus,
  shouldConfirmMarketStatusChange,
} from "./country-market-status";
import type { Country } from "./taxonomy-types";

const india: Country = {
  id: "c-in",
  name: "India",
  code: "IN",
  enabled: true,
  comingSoon: false,
};

const uae: Country = {
  id: "c-ae",
  name: "United Arab Emirates",
  code: "AE",
  enabled: true,
  comingSoon: true,
};

describe("country market status", () => {
  it("derives status from enabled and comingSoon flags", () => {
    expect(getCountryMarketStatus(india)).toBe("live");
    expect(getCountryMarketStatus(uae)).toBe("coming_soon");
    expect(getCountryMarketStatus({ ...india, enabled: false })).toBe("hidden");
    expect(getCountryMarketStatus({ ...uae, enabled: false })).toBe("hidden");
  });

  it("counts live countries", () => {
    expect(countLiveCountries([india, uae])).toBe(1);
    expect(countLiveCountries([uae])).toBe(0);
  });

  it("applies market status to country input", () => {
    const input = { name: "Test", code: "XX" };
    expect(applyMarketStatus(input, "live")).toEqual({
      ...input,
      enabled: true,
      comingSoon: false,
    });
    expect(applyMarketStatus(input, "coming_soon")).toEqual({
      ...input,
      enabled: true,
      comingSoon: true,
    });
    expect(applyMarketStatus(input, "hidden")).toEqual({
      ...input,
      enabled: false,
      comingSoon: false,
    });
  });

  it("requires confirmation when hiding the only live market", () => {
    const prompt = shouldConfirmMarketStatusChange({
      country: india,
      countries: [india, uae],
      nextStatus: "hidden",
    });
    expect(prompt?.required).toBe(true);
    expect(prompt?.message).toContain("only live market");
  });

  it("requires confirmation when enabling a second live market", () => {
    const prompt = shouldConfirmMarketStatusChange({
      country: uae,
      countries: [india, uae],
      nextStatus: "live",
    });
    expect(prompt?.required).toBe(true);
    expect(prompt?.message).toContain("switch between");
  });

  it("skips confirmation when status unchanged", () => {
    expect(
      shouldConfirmMarketStatusChange({
        country: india,
        countries: [india],
        nextStatus: "live",
      })
    ).toBeNull();
  });
});
