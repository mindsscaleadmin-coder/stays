/**
 * Marketplace booking policies — single matrix used by server APIs and host UI.
 */

export const PENDING_RESPONSE_HOURS = 24;

export type CancellationPolicyId =
  | "flexible"
  | "moderate"
  | "strict"
  | "non-refundable";

export type CancellationPolicyRule = {
  id: CancellationPolicyId;
  label: string;
  shortDescription: string;
  /** Hours before check-in for full (or primary) refund window */
  fullRefundHoursBefore: number;
  fullRefundPercent: number;
  /** Hours before check-in for partial window (after full window closes) */
  partialRefundHoursBefore: number;
  partialRefundPercent: number;
};

/** One clear cancellation matrix */
export const CANCELLATION_MATRIX: CancellationPolicyRule[] = [
  {
    id: "flexible",
    label: "Flexible",
    shortDescription: "Full refund ≥7 days before; 50% until 48h; none after",
    fullRefundHoursBefore: 7 * 24,
    fullRefundPercent: 100,
    partialRefundHoursBefore: 48,
    partialRefundPercent: 50,
  },
  {
    id: "moderate",
    label: "Moderate",
    shortDescription: "Full refund ≥14 days; 50% until 7 days; none after",
    fullRefundHoursBefore: 14 * 24,
    fullRefundPercent: 100,
    partialRefundHoursBefore: 7 * 24,
    partialRefundPercent: 50,
  },
  {
    id: "strict",
    label: "Strict",
    shortDescription: "50% refund ≥30 days before; none after",
    fullRefundHoursBefore: 30 * 24,
    fullRefundPercent: 50,
    partialRefundHoursBefore: 30 * 24,
    partialRefundPercent: 0,
  },
  {
    id: "non-refundable",
    label: "Non-refundable",
    shortDescription: "No refund after booking is confirmed",
    fullRefundHoursBefore: 0,
    fullRefundPercent: 0,
    partialRefundHoursBefore: 0,
    partialRefundPercent: 0,
  },
];

export function getCancellationRule(
  policyId?: string | null
): CancellationPolicyRule {
  const found = CANCELLATION_MATRIX.find((p) => p.id === policyId);
  return found ?? CANCELLATION_MATRIX[0];
}

export function computePendingExpiresAt(
  createdAt: Date = new Date(),
  hours: number = PENDING_RESPONSE_HOURS
): Date {
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function isPendingExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false;
  const end = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime();
}

export type RefundEvaluation = {
  policyId: CancellationPolicyId;
  policyLabel: string;
  hoursUntilCheckIn: number;
  refundPercent: number;
  refundAmount: number;
  band: "full" | "partial" | "none";
  summary: string;
  stripeEligible: boolean;
};

function hoursUntil(checkIn: Date, now: Date): number {
  return (checkIn.getTime() - now.getTime()) / (60 * 60 * 1000);
}

/**
 * Evaluate guest/host cancellation refund from the matrix.
 * Host-initiated cancels for guest convenience can pass forceFullRefund.
 */
export function evaluateCancellationRefund(input: {
  policyId?: string | null;
  checkIn: Date | string;
  totalPrice: number;
  now?: Date;
  /** Host cancels and chooses to refund guest in full */
  forceFullRefund?: boolean;
  paymentStatus?: string;
}): RefundEvaluation {
  const rule = getCancellationRule(input.policyId);
  const checkIn =
    typeof input.checkIn === "string"
      ? new Date(input.checkIn.includes("T") ? input.checkIn : `${input.checkIn}T12:00:00`)
      : input.checkIn;
  const now = input.now ?? new Date();
  const hrs = hoursUntil(checkIn, now);
  const paid = (input.paymentStatus ?? "paid").toLowerCase() === "paid";

  if (input.forceFullRefund) {
    const amount = paid ? roundMoney(input.totalPrice) : 0;
    return {
      policyId: rule.id,
      policyLabel: rule.label,
      hoursUntilCheckIn: hrs,
      refundPercent: paid ? 100 : 0,
      refundAmount: amount,
      band: paid ? "full" : "none",
      summary: paid
        ? "Host cancellation — full refund to guest"
        : "No payment to refund",
      stripeEligible: paid && amount > 0,
    };
  }

  let refundPercent = 0;
  let band: RefundEvaluation["band"] = "none";

  if (rule.id === "non-refundable" || rule.fullRefundPercent === 0) {
    refundPercent = 0;
    band = "none";
  } else if (hrs >= rule.fullRefundHoursBefore) {
    refundPercent = rule.fullRefundPercent;
    band = refundPercent >= 100 ? "full" : refundPercent > 0 ? "partial" : "none";
  } else if (hrs >= rule.partialRefundHoursBefore) {
    refundPercent = rule.partialRefundPercent;
    band = refundPercent > 0 ? "partial" : "none";
  } else {
    refundPercent = 0;
    band = "none";
  }

  const refundAmount = paid ? roundMoney((input.totalPrice * refundPercent) / 100) : 0;

  const summary =
    band === "full"
      ? `${refundPercent}% refund (${rule.label}) — ${Math.floor(hrs)}h before check-in`
      : band === "partial"
        ? `${refundPercent}% refund (${rule.label}) — within partial window`
        : `No refund under ${rule.label} policy`;

  return {
    policyId: rule.id,
    policyLabel: rule.label,
    hoursUntilCheckIn: hrs,
    refundPercent,
    refundAmount,
    band,
    summary,
    stripeEligible: paid && refundAmount > 0,
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function refundStatusFromBand(
  band: RefundEvaluation["band"]
): "none" | "partial" | "full" {
  if (band === "full") return "full";
  if (band === "partial") return "partial";
  return "none";
}
