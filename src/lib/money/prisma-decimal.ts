import { Prisma } from "@prisma/client";

/** Coerce Prisma Decimal / DB money values to JS number at API boundaries. */
export function asMoneyNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return value.toNumber();
}

/** Persist a JS number as DECIMAL(12,2). */
export function toMoneyDecimal(value: number): Prisma.Decimal {
  const rounded = Math.round(value * 100) / 100;
  return new Prisma.Decimal(rounded.toFixed(2));
}
