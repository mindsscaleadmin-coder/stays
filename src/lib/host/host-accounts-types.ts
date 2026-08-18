export type PayoutMethod = "bank" | "upi";

export type PayoutStatus = "scheduled" | "processing" | "paid" | "failed";

export interface HostPayoutAccount {
  method: PayoutMethod;
  accountHolder: string;
  /** Bank transfer */
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swift?: string;
  /** UPI */
  upiId?: string;
  updatedAt: string;
}

export interface HostUpcomingPayout {
  id: string;
  scheduledDate: string;
  amount: number;
  currency: string;
  status: "scheduled" | "processing";
  bookingCount: number;
}

export interface HostPayoutRecord {
  id: string;
  paidDate: string;
  amount: number;
  currency: string;
  reference: string;
  method: PayoutMethod;
  status: "paid" | "failed";
}

export interface HostTransaction {
  id: string;
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

export interface HostInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  guestName: string;
  property: string;
  currency: string;
  netAmount: number;
  bookingRef: string;
}

export interface HostAccountsData {
  hostId: string;
  payoutAccount: HostPayoutAccount | null;
  upcomingPayouts: HostUpcomingPayout[];
  payoutHistory: HostPayoutRecord[];
  transactions: HostTransaction[];
  invoices: HostInvoice[];
}

export interface HostPayoutAccountInput {
  method: PayoutMethod;
  accountHolder: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swift?: string;
  upiId?: string;
}
