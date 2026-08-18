export type AdminPayoutStatus = "pending_review" | "approved" | "held" | "processing" | "paid";

export type RefundRequestStatus = "pending" | "approved" | "rejected";

export interface HostCommissionOverride {
  hostId: string;
  hostName: string;
  feePct: number;
  note?: string;
}

export interface PlatformCommissionSettings {
  globalFeePct: number;
  /** Flat service fee added per booking (display / config) */
  globalServiceFeeFlat: number;
  hostOverrides: HostCommissionOverride[];
}

export interface AdminPayoutState {
  adminStatus: AdminPayoutStatus;
  holdReason?: string;
  reviewedAt?: string;
}

export interface AdminPayoutItem {
  id: string;
  hostId: string;
  hostName: string;
  scheduledDate: string;
  amount: number;
  currency: string;
  bookingCount: number;
  sourceStatus: "scheduled" | "processing" | "paid";
  adminStatus: AdminPayoutStatus;
  holdReason?: string;
}

export interface AdminTransactionRow {
  id: string;
  hostId: string;
  hostName: string;
  date: string;
  guestName: string;
  property: string;
  bookingRef: string;
  currency: string;
  grossAmount: number;
  platformFeePct: number;
  platformFee: number;
  taxAmount: number;
  taxLabel: string;
  netEarnings: number;
  payoutStatus: "pending" | "included" | "paid";
}

export interface RefundRequest {
  id: string;
  bookingRef: string;
  guestName: string;
  hostName: string;
  amount: string;
  currency: string;
  reason: string;
  status: RefundRequestStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface FinancialReport {
  platformRevenue: number;
  hostEarnings: number;
  taxCollected: number;
  outstandingPayouts: number;
  pendingRefunds: number;
  currency: string;
  transactionCount: number;
}

export interface FinancialSettings {
  commission: PlatformCommissionSettings;
  payoutStates: Record<string, AdminPayoutState>;
  refundRequests: RefundRequest[];
}
