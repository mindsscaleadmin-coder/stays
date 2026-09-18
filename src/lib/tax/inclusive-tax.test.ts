import { describe, expect, it } from "vitest";
import { extractInclusiveTax } from "./inclusive-tax";

describe("extractInclusiveTax", () => {
  it("extracts 5% VAT from inclusive total", () => {
    const { taxAmount, netAmount } = extractInclusiveTax(1000, 5);
    expect(taxAmount).toBe(48);
    expect(netAmount).toBe(952);
    expect(taxAmount + netAmount).toBe(1000);
  });

  it("extracts 18% GST from inclusive total", () => {
    const { taxAmount, netAmount } = extractInclusiveTax(1180, 18);
    expect(taxAmount).toBe(180);
    expect(netAmount).toBe(1000);
  });

  it("returns zero tax for 0% rate", () => {
    const { taxAmount, netAmount } = extractInclusiveTax(500, 0);
    expect(taxAmount).toBe(0);
    expect(netAmount).toBe(500);
  });
});
