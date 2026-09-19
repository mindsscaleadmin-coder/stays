import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { asMoneyNumber, toMoneyDecimal } from "./prisma-decimal";

describe("prisma-decimal money helpers", () => {
  it("asMoneyNumber handles Decimal and numbers", () => {
    expect(asMoneyNumber(42.5)).toBe(42.5);
    expect(asMoneyNumber(new Prisma.Decimal("99.99"))).toBe(99.99);
    expect(asMoneyNumber(null)).toBe(0);
  });

  it("toMoneyDecimal rounds to cents", () => {
    expect(toMoneyDecimal(10.005).toFixed(2)).toBe("10.01");
  });
});
