import type {
  HostAccountsData,
  HostPayoutAccountInput,
} from "./host-accounts-types";
import { getPlatformCommissionPct } from "@/lib/admin/financial-data";
import { emitSyncEvent } from "@/lib/emit-sync-event";
import { LAUNCH_CURRENCY, LAUNCH_TAX_LABEL } from "@/lib/tax/launch-market";

const STORAGE_KEY = "farm-stays-host-accounts";
export const HOST_ACCOUNTS_SYNC_EVENT = "farm-stays-host-accounts-updated";

function defaultForHost(hostId: string): HostAccountsData {
  const platformFeePct = getPlatformCommissionPct(hostId);
  return {
    hostId,
    payoutAccount: null,
    upcomingPayouts: [
      {
        id: "up-1",
        scheduledDate: "2026-07-25",
        amount: 6101,
        currency: LAUNCH_CURRENCY,
        status: "scheduled",
        bookingCount: 2,
      },
      {
        id: "up-2",
        scheduledDate: "2026-08-01",
        amount: 4280,
        currency: LAUNCH_CURRENCY,
        status: "processing",
        bookingCount: 1,
      },
    ],
    payoutHistory: [
      {
        id: "ph-1",
        paidDate: "2026-07-05",
        amount: 8920,
        currency: LAUNCH_CURRENCY,
        reference: "PAY-20260705-A8K2",
        method: "bank",
        status: "paid",
      },
      {
        id: "ph-2",
        paidDate: "2026-06-20",
        amount: 5640,
        currency: LAUNCH_CURRENCY,
        reference: "PAY-20260620-H2K9",
        method: "bank",
        status: "paid",
      },
    ],
    transactions: [
      {
        id: "tx-1",
        date: "2026-07-18",
        guestName: "James Wilson",
        property: "Green Valley Farmhouse",
        bookingRef: "GF-M9O2T4",
        currency: LAUNCH_CURRENCY,
        grossAmount: 7350,
        platformFeePct,
        platformFee: 882,
        taxAmount: 350,
        taxLabel: LAUNCH_TAX_LABEL,
        netEarnings: 6118,
        payoutStatus: "pending",
      },
      {
        id: "tx-2",
        date: "2026-07-10",
        guestName: "Sarah Ahmed",
        property: "Green Valley Farmhouse",
        bookingRef: "GF-A8K2X1",
        currency: LAUNCH_CURRENCY,
        grossAmount: 5200,
        platformFeePct,
        platformFee: 624,
        taxAmount: 248,
        taxLabel: LAUNCH_TAX_LABEL,
        netEarnings: 4328,
        payoutStatus: "included",
      },
      {
        id: "tx-3",
        date: "2026-06-28",
        guestName: "Raj Patel",
        property: "Spice Garden Cottage",
        bookingRef: "GF-K7M1Q3",
        currency: LAUNCH_CURRENCY,
        grossAmount: 3800,
        platformFeePct,
        platformFee: 456,
        taxAmount: 181,
        taxLabel: LAUNCH_TAX_LABEL,
        netEarnings: 3163,
        payoutStatus: "paid",
      },
    ],
    invoices: [
      {
        id: "inv-1",
        invoiceNumber: "FS-INV-2026-0042",
        date: "2026-07-05",
        guestName: "Sarah Ahmed",
        property: "Green Valley Farmhouse",
        currency: LAUNCH_CURRENCY,
        netAmount: 4328,
        bookingRef: "GF-A8K2X1",
      },
      {
        id: "inv-2",
        invoiceNumber: "FS-INV-2026-0038",
        date: "2026-06-20",
        guestName: "Raj Patel",
        property: "Spice Garden Cottage",
        currency: LAUNCH_CURRENCY,
        netAmount: 3163,
        bookingRef: "GF-K7M1Q3",
      },
    ],
  };
}

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_ACCOUNTS_SYNC_EVENT);
}

function sanitizeAccountsRecord(data: HostAccountsData): { data: HostAccountsData; changed: boolean } {
  let changed = false;
  const sanitizeCurrency = (c?: string): string => {
    if (!c || c === "AED") {
      if (c !== LAUNCH_CURRENCY) changed = true;
      return LAUNCH_CURRENCY;
    }
    return c;
  };
  const upcomingPayouts = data.upcomingPayouts.map((p) => {
    const cur = sanitizeCurrency(p.currency);
    return cur !== p.currency ? { ...p, currency: cur } : p;
  });
  const payoutHistory = data.payoutHistory.map((p) => {
    const cur = sanitizeCurrency(p.currency);
    return cur !== p.currency ? { ...p, currency: cur } : p;
  });
  const transactions = data.transactions.map((tx) => {
    const cur = sanitizeCurrency(tx.currency);
    const taxLabel = tx.taxLabel === "VAT" ? LAUNCH_TAX_LABEL : tx.taxLabel;
    if (taxLabel !== tx.taxLabel) changed = true;
    return cur !== tx.currency || taxLabel !== tx.taxLabel
      ? { ...tx, currency: cur, taxLabel }
      : tx;
  });
  const invoices = data.invoices.map((inv) => {
    const cur = sanitizeCurrency(inv.currency);
    return cur !== inv.currency ? { ...inv, currency: cur } : inv;
  });

  return {
    data: changed
      ? { ...data, upcomingPayouts, payoutHistory, transactions, invoices }
      : data,
    changed,
  };
}

function readAll(): Record<string, HostAccountsData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, HostAccountsData>;
    let anyChanged = false;
    const sanitized: Record<string, HostAccountsData> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const { data, changed } = sanitizeAccountsRecord(v);
      sanitized[k] = data;
      if (changed) anyChanged = true;
    }
    if (anyChanged) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, HostAccountsData>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

export function loadHostAccounts(hostId: string): HostAccountsData {
  const stored = readAll()[hostId];
  if (!stored) return defaultForHost(hostId);
  return { ...defaultForHost(hostId), ...stored, hostId };
}

export function saveHostAccounts(data: HostAccountsData): void {
  const map = readAll();
  map[data.hostId] = data;
  writeAll(map);
}

export function savePayoutAccount(
  hostId: string,
  input: HostPayoutAccountInput
): HostAccountsData {
  const data = loadHostAccounts(hostId);
  const next: HostAccountsData = {
    ...data,
    payoutAccount: {
      method: input.method,
      accountHolder: input.accountHolder.trim(),
      bankName: input.bankName?.trim() || undefined,
      accountNumber: input.accountNumber?.trim() || undefined,
      iban: input.iban?.trim() || undefined,
      swift: input.swift?.trim() || undefined,
      upiId: input.upiId?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    },
  };
  saveHostAccounts(next);
  return next;
}

export function buildInvoiceText(invoice: HostAccountsData["invoices"][0]): string {
  return [
    "FARM STAYS — HOST PAYOUT RECEIPT",
    "================================",
    `Invoice: ${invoice.invoiceNumber}`,
    `Date: ${invoice.date}`,
    `Booking: ${invoice.bookingRef}`,
    `Property: ${invoice.property}`,
    `Guest: ${invoice.guestName}`,
    "",
    `Net payout: ${invoice.currency} ${invoice.netAmount.toLocaleString()}`,
    "",
    "Thank you for hosting with Farm Stays.",
  ].join("\n");
}
