import { describe, expect, it } from "vitest";
import {
  BASE_CURRENCY,
  currencyForCountryName,
  defaultCurrency,
  formatMoney,
  fromAed,
  normalizeCurrency,
  toAed,
} from "./currency";

describe("currency defaults", () => {
  it("exposes one platform baseline", () => {
    expect(BASE_CURRENCY).toBe("AED");
    expect(defaultCurrency()).toBe(BASE_CURRENCY);
  });

  it("normalizeCurrency falls back to baseline", () => {
    expect(normalizeCurrency(undefined)).toBe(BASE_CURRENCY);
    expect(normalizeCurrency("")).toBe(BASE_CURRENCY);
    expect(normalizeCurrency("inr")).toBe("INR");
    expect(normalizeCurrency("xx")).toBe(BASE_CURRENCY);
  });

  it("currencyForCountryName maps known markets", () => {
    expect(currencyForCountryName("India")).toBe("INR");
    expect(currencyForCountryName("Oman")).toBe("OMR");
    expect(currencyForCountryName("Unknown")).toBe(BASE_CURRENCY);
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
