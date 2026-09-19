import { describe, expect, it } from "vitest";
import {
  BASE_CURRENCY,
  DISPLAY_DEFAULT_CURRENCY,
  currencyForCountryName,
  defaultCurrency,
  formatMoney,
  fromAed,
  normalizeCurrency,
  toAed,
} from "./currency";

describe("currency defaults", () => {
  it("keeps AED as conversion anchor and INR as display default", () => {
    expect(BASE_CURRENCY).toBe("AED");
    expect(DISPLAY_DEFAULT_CURRENCY).toBe("INR");
    expect(defaultCurrency()).toBe("INR");
  });

  it("normalizeCurrency falls back to launch display currency", () => {
    expect(normalizeCurrency(undefined)).toBe("INR");
    expect(normalizeCurrency("")).toBe("INR");
    expect(normalizeCurrency("inr")).toBe("INR");
    expect(normalizeCurrency("xx")).toBe("INR");
  });

  it("currencyForCountryName maps known markets", () => {
    expect(currencyForCountryName("India")).toBe("INR");
    expect(currencyForCountryName("Oman")).toBe("OMR");
    expect(currencyForCountryName("United Arab Emirates")).toBe("AED");
    expect(currencyForCountryName("Unknown")).toBe("INR");
  });

  it("converts using exchange rates", () => {
    expect(toAed(10, 9.54)).toBeCloseTo(95.4);
    expect(fromAed(95.4, 9.54)).toBeCloseTo(10);
  });

  it("formatMoney includes currency code", () => {
    expect(formatMoney(1000, { currency: BASE_CURRENCY })).toContain("AED");
    expect(formatMoney(1000, { currency: "INR", exchangeRateToAED: 0.043 })).toContain("INR");
  });
});
