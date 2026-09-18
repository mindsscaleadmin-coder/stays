import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANCELLATION_POLICY_ID,
  evaluateCancellationRefund,
  getCancellationRule,
  isPendingExpired,
  computePendingExpiresAt,
} from "./policies";

describe("evaluateCancellationRefund", () => {
  const checkIn = new Date("2026-10-01T12:00:00");

  it("flexible: full refund when far from check-in", () => {
    const result = evaluateCancellationRefund({
      policyId: "flexible",
      checkIn,
      totalPrice: 1000,
      paymentStatus: "paid",
      now: new Date("2026-09-01T12:00:00"),
    });
    expect(result.band).toBe("full");
    expect(result.refundPercent).toBe(100);
    expect(result.refundAmount).toBe(1000);
    expect(result.stripeEligible).toBe(true);
  });

  it("flexible: 50% in partial window", () => {
    const result = evaluateCancellationRefund({
      policyId: "flexible",
      checkIn,
      totalPrice: 1000,
      paymentStatus: "paid",
      now: new Date("2026-09-29T12:00:00"), // 48h before
    });
    expect(result.band).toBe("partial");
    expect(result.refundPercent).toBe(50);
    expect(result.refundAmount).toBe(500);
  });

  it("flexible: no refund inside 48h", () => {
    const result = evaluateCancellationRefund({
      policyId: "flexible",
      checkIn,
      totalPrice: 1000,
      paymentStatus: "paid",
      now: new Date("2026-09-30T18:00:00"),
    });
    expect(result.band).toBe("none");
    expect(result.refundAmount).toBe(0);
    expect(result.stripeEligible).toBe(false);
  });

  it("non-refundable never refunds guest cancels", () => {
    const result = evaluateCancellationRefund({
      policyId: "non-refundable",
      checkIn,
      totalPrice: 800,
      paymentStatus: "paid",
      now: new Date("2026-08-01T12:00:00"),
    });
    expect(result.band).toBe("none");
    expect(result.refundAmount).toBe(0);
  });

  it("forceFullRefund refunds paid bookings for host cancel", () => {
    const result = evaluateCancellationRefund({
      policyId: "non-refundable",
      checkIn,
      totalPrice: 800,
      paymentStatus: "paid",
      forceFullRefund: true,
      now: new Date("2026-09-30T12:00:00"),
    });
    expect(result.band).toBe("full");
    expect(result.refundAmount).toBe(800);
  });

  it("unpaid bookings never create a refund amount", () => {
    const result = evaluateCancellationRefund({
      policyId: "flexible",
      checkIn,
      totalPrice: 1000,
      paymentStatus: "unpaid",
      now: new Date("2026-09-01T12:00:00"),
    });
    expect(result.refundAmount).toBe(0);
    expect(result.stripeEligible).toBe(false);
  });

  it("moderate full window is 14 days", () => {
    const rule = getCancellationRule("moderate");
    expect(rule.fullRefundHoursBefore).toBe(14 * 24);
    const result = evaluateCancellationRefund({
      policyId: "moderate",
      checkIn,
      totalPrice: 400,
      paymentStatus: "paid",
      now: new Date("2026-09-10T12:00:00"), // 21 days out
    });
    expect(result.refundPercent).toBe(100);
  });
});

describe("getCancellationRule", () => {
  it("defaults to moderate when policyId is missing", () => {
    expect(getCancellationRule(null).id).toBe(DEFAULT_CANCELLATION_POLICY_ID);
    expect(getCancellationRule(undefined).id).toBe("moderate");
  });
});

describe("pending expiry helpers", () => {
  it("computePendingExpiresAt adds 24h by default", () => {
    const start = new Date("2026-09-07T10:00:00Z");
    const end = computePendingExpiresAt(start);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("isPendingExpired detects past expiry", () => {
    expect(isPendingExpired(new Date("2020-01-01"), new Date("2026-01-01"))).toBe(true);
    expect(isPendingExpired(new Date("2030-01-01"), new Date("2026-01-01"))).toBe(false);
    expect(isPendingExpired(null)).toBe(false);
  });
});
