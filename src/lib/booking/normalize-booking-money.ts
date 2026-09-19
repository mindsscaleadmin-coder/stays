import type { Prisma } from "@prisma/client";
import { asMoneyNumber } from "@/lib/money/prisma-decimal";

type MoneyBooking = {
  totalPrice: Prisma.Decimal | number;
  refundAmount?: Prisma.Decimal | number | null;
};

/** Normalize Prisma money fields on a booking row for app-layer math. */
export function normalizeBookingMoney<T extends MoneyBooking>(booking: T) {
  return {
    ...booking,
    totalPrice: asMoneyNumber(booking.totalPrice),
    refundAmount:
      booking.refundAmount != null ? asMoneyNumber(booking.refundAmount) : null,
  };
}
