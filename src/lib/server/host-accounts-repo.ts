import { prisma } from "@/lib/prisma";
import { asMoneyNumber } from "@/lib/money/prisma-decimal";
import { getFinancialSettingsFromDb } from "@/lib/server/platform-catalog-repo";
import { clampCommissionPct } from "@/lib/admin/platform-config-data";
import { computeFinancialReport } from "@/lib/admin/financial-data";
import type {
  AdminPayoutItem,
  AdminTransactionRow,
  FinancialReport,
  FinancialSettings,
  RefundRequest,
} from "@/lib/admin/financial-types";
import type {
  HostAccountsData,
  HostPayoutAccount,
  HostPayoutAccountInput,
  HostPayoutRecord,
  HostTransaction,
} from "@/lib/host/host-accounts-types";
import {
  mergeFinancialHostOption,
  mergeFinancialHostOptions,
  resolveHostName,
  type FinancialHostOption,
} from "@/lib/admin/financial-data";
import { LAUNCH_COUNTRY_NAME } from "@/lib/tax/launch-market";
import { isDirectoryListing } from "@/lib/booking/is-directory-listing";
import { parseFinancialSnapshot } from "@/lib/booking/financial-snapshot";
import {
  estimateGuestQuoteSnapshot,
  parseGuestQuoteSnapshot,
} from "@/lib/booking/guest-quote-snapshot";
import { defaultForListing } from "@/lib/host/host-pricing-data";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { currencyForCountryName, normalizeCurrency } from "@/lib/currency";
import { LAUNCH_CURRENCY, LAUNCH_TAX_LABEL, LAUNCH_TAX_PCT } from "@/lib/tax/launch-market";

type StoredAccounts = {
  payoutAccount: HostPayoutAccount | null;
  paidBatches?: Array<HostPayoutRecord & { bookingIds?: string[] }>;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextFriday(from = new Date()): string {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const add = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return ymd(d);
}

function parseListingMeta(payload: string): {
  currency: string;
  country: string;
  state: string;
  parentCategory: string;
  type: string;
  category: string;
} {
  try {
    const p = JSON.parse(payload) as {
      currency?: string;
      country?: string;
      state?: string;
      parentCategory?: string;
      type?: string;
      category?: string;
    };
    return {
      currency: p.currency || LAUNCH_CURRENCY,
      country: p.country?.trim() || "",
      state: p.state?.trim() || "",
      parentCategory: p.parentCategory?.trim() || "",
      type: p.type?.trim() || "",
      category: p.category?.trim() || "",
    };
  } catch {
    return {
      currency: LAUNCH_CURRENCY,
      country: "",
      state: "",
      parentCategory: "",
      type: "",
      category: "",
    };
  }
}

function parseStored(raw: string | null | undefined): StoredAccounts {
  if (!raw) return { payoutAccount: null, paidBatches: [] };
  try {
    const parsed = JSON.parse(raw) as StoredAccounts;
    return {
      payoutAccount: parsed.payoutAccount ?? null,
      paidBatches: Array.isArray(parsed.paidBatches) ? parsed.paidBatches : [],
    };
  } catch {
    return { payoutAccount: null, paidBatches: [] };
  }
}

async function ensureHostUser(hostId: string, fallbackName = "Host") {
  const existing = await prisma.user.findUnique({ where: { id: hostId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: hostId,
      fullName: fallbackName,
      email: `${hostId.replace(/[^a-zA-Z0-9]/g, "")}@hosts.local`,
      roles: JSON.stringify(["host"]),
      isVerified: true,
    },
  });
}

function commissionPct(
  settings: FinancialSettings,
  hostId: string,
  listing?: { parentCategory?: string; type?: string; category?: string }
): number {
  if (listing && isDirectoryListing(listing)) return 0;
  const override = settings.commission.hostOverrides.find((o) => o.hostId === hostId);
  return clampCommissionPct(override?.feePct ?? settings.commission.globalFeePct);
}

function paidBookingIds(stored: StoredAccounts): Set<string> {
  const ids = new Set<string>();
  for (const batch of stored.paidBatches ?? []) {
    for (const id of batch.bookingIds ?? []) ids.add(id);
  }
  return ids;
}

type LedgerBooking = {
  id: string;
  listingId: string;
  bookingReference: string;
  totalPrice: number;
  paymentStatus: string;
  refundAmount: number | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  guestQuoteSnapshot: string | null;
  financialSnapshot: string | null;
  guest: { fullName: string };
  listing: {
    hostId: string;
    title: string;
    payload: string;
    country: string | null;
    host: { fullName: string };
  };
};

type PricingCache = Map<string, Awaited<ReturnType<typeof getListingPricing>>>;

async function pricingForListing(listingId: string, cache: PricingCache) {
  if (cache.has(listingId)) return cache.get(listingId)!;
  const pricing = (await getListingPricing(listingId)) ?? defaultForListing(listingId);
  cache.set(listingId, pricing);
  return pricing;
}

async function resolveTaxForRow(row: LedgerBooking, currency: string, cache: PricingCache) {
  const financial = parseFinancialSnapshot(row.financialSnapshot);
  const guest = parseGuestQuoteSnapshot(row.guestQuoteSnapshot);
  if (financial) {
    return { taxAmount: financial.taxAmount, taxLabel: financial.taxLabel };
  }
  if (guest) {
    return { taxAmount: guest.taxAmount, taxLabel: guest.taxLabel };
  }
  const pricing = await pricingForListing(row.listingId, cache);
  const estimate = estimateGuestQuoteSnapshot({
    totalPrice: row.totalPrice,
    currency,
    taxPct: pricing?.taxPct ?? LAUNCH_TAX_PCT,
    taxLabel: pricing?.taxLabel ?? LAUNCH_TAX_LABEL,
  });
  return { taxAmount: estimate.taxAmount, taxLabel: estimate.taxLabel };
}

async function toTransaction(
  row: LedgerBooking,
  settings: FinancialSettings,
  included: Set<string>,
  pricingCache: PricingCache
): Promise<AdminTransactionRow> {
  const meta = parseListingMeta(row.listing.payload);
  const hostId = row.listing.hostId;
  const currency = normalizeCurrency(
    meta.currency || currencyForCountryName(row.listing.country || meta.country)
  );
  const financial = parseFinancialSnapshot(row.financialSnapshot);
  const pct = financial?.platformFeePct ?? commissionPct(settings, hostId, meta);
  const refunded = row.paymentStatus.toLowerCase().includes("refund");
  const refundAmount = row.refundAmount ?? 0;
  const remaining = Math.max(0, row.totalPrice - (refunded ? refundAmount : 0));
  const platformFee =
    financial?.platformFee ??
    Math.round(((remaining > 0 ? remaining : row.totalPrice) * pct) / 100 * 100) / 100;
  const net =
    financial?.hostNetEarnings ??
    (refunded && refundAmount >= row.totalPrice
      ? 0
      : Math.round((remaining - (remaining > 0 ? platformFee : 0)) * 100) / 100);

  const { taxAmount, taxLabel } = await resolveTaxForRow(row, currency, pricingCache);

  let payoutStatus: HostTransaction["payoutStatus"] = "pending";
  if (included.has(row.id)) payoutStatus = "paid";
  else if (refunded) payoutStatus = "included";
  else if (row.paymentStatus === "paid") payoutStatus = "pending";

  return {
    id: row.id,
    hostId,
    hostName: row.listing.host.fullName,
    date: ymd(row.createdAt),
    guestName: row.guest.fullName,
    property: row.listing.title,
    bookingRef: row.bookingReference,
    currency,
    grossAmount: row.totalPrice,
    platformFeePct: pct,
    platformFee,
    taxAmount,
    taxLabel,
    netEarnings: net,
    payoutStatus,
    stripeProcessingFee: financial?.stripeProcessingFee,
  };
}

function upcomingForHost(
  hostId: string,
  hostName: string,
  txs: AdminTransactionRow[],
  settings: FinancialSettings
): AdminPayoutItem | null {
  const pending = txs.filter(
    (tx) => tx.hostId === hostId && tx.payoutStatus === "pending" && tx.netEarnings > 0
  );
  if (pending.length === 0) return null;
  const scheduledDate = nextFriday();
  const id = `payout-${hostId}-${scheduledDate}`;
  const state = settings.payoutStates[id];
  const amount = pending.reduce((sum, tx) => sum + tx.netEarnings, 0);
  return {
    id,
    hostId,
    hostName,
    scheduledDate,
    amount: Math.round(amount * 100) / 100,
    currency: pending[0]?.currency ?? LAUNCH_CURRENCY,
    bookingCount: pending.length,
    sourceStatus: "scheduled",
    adminStatus: state?.adminStatus ?? "pending_review",
    holdReason: state?.holdReason,
  };
}

function historyForHost(
  hostId: string,
  stored: StoredAccounts,
  settings: FinancialSettings
): AdminPayoutItem[] {
  return (stored.paidBatches ?? []).map((batch) => {
    const state = settings.payoutStates[batch.id];
    return {
      id: batch.id,
      hostId,
      hostName: "",
      scheduledDate: batch.paidDate,
      amount: batch.amount,
      currency: batch.currency,
      bookingCount: batch.bookingIds?.length ?? 0,
      sourceStatus: "paid" as const,
      adminStatus: state?.adminStatus ?? "paid",
      holdReason: state?.holdReason,
    };
  });
}

function refundsFromBookings(rows: LedgerBooking[]): RefundRequest[] {
  return rows
    .filter((row) => (row.refundAmount ?? 0) > 0 || row.paymentStatus.toLowerCase().includes("refund"))
    .map((row) => {
      const meta = parseListingMeta(row.listing.payload);
      const pay = row.paymentStatus.toLowerCase();
      return {
        id: `refund-${row.id}`,
        bookingRef: row.bookingReference,
        guestName: row.guest.fullName,
        hostName: row.listing.host.fullName,
        amount: String(row.refundAmount ?? 0),
        currency: meta.currency,
        reason: row.cancelReason || "Cancellation refund",
        status: pay === "refunded" ? "approved" : pay === "refund_pending" ? "pending" : "approved",
        requestedAt: (row.cancelledAt ?? row.createdAt).toISOString(),
      } satisfies RefundRequest;
    });
}

async function loadPaidBookings(hostId?: string): Promise<LedgerBooking[]> {
  const rows = await prisma.booking.findMany({
    where: {
      paymentStatus: { in: ["paid", "refund_pending", "refunded"] },
      ...(hostId ? { listing: { hostId } } : {}),
    },
    select: {
      id: true,
      listingId: true,
      bookingReference: true,
      totalPrice: true,
      paymentStatus: true,
      refundAmount: true,
      cancelledAt: true,
      cancelReason: true,
      createdAt: true,
      guestQuoteSnapshot: true,
      financialSnapshot: true,
      guest: { select: { fullName: true } },
      listing: {
        select: {
          hostId: true,
          title: true,
          payload: true,
          country: true,
          host: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    ...row,
    totalPrice: asMoneyNumber(row.totalPrice),
    refundAmount: row.refundAmount != null ? asMoneyNumber(row.refundAmount) : null,
  }));
}

async function mapTransactions(
  rows: LedgerBooking[],
  settings: FinancialSettings,
  included: Set<string>
): Promise<AdminTransactionRow[]> {
  const pricingCache: PricingCache = new Map();
  return Promise.all(rows.map((row) => toTransaction(row, settings, included, pricingCache)));
}

export async function getHostAccountsPayload(hostId: string): Promise<StoredAccounts> {
  const row = await prisma.hostAccounts.findUnique({ where: { hostId } });
  return parseStored(row?.payload);
}

export async function savePayoutAccount(
  hostId: string,
  input: HostPayoutAccountInput
): Promise<HostPayoutAccount> {
  await ensureHostUser(hostId, input.accountHolder);
  const current = await getHostAccountsPayload(hostId);
  const payoutAccount: HostPayoutAccount = {
    method: input.method,
    accountHolder: input.accountHolder.trim(),
    bankName: input.bankName?.trim() || undefined,
    accountNumber: input.accountNumber?.trim() || undefined,
    iban: input.iban?.trim() || undefined,
    swift: input.swift?.trim() || undefined,
    upiId: input.upiId?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  const next: StoredAccounts = { ...current, payoutAccount };
  await prisma.hostAccounts.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(next) },
    update: { payload: JSON.stringify(next) },
  });
  return payoutAccount;
}

export async function markPayoutBatchPaid(payoutId: string): Promise<void> {
  const match = /^payout-(.+)-(\d{4}-\d{2}-\d{2})$/.exec(payoutId);
  if (!match) return;
  const hostId = match[1];
  const paidDate = match[2];
  const settings = await getFinancialSettingsFromDb();
  const stored = await getHostAccountsPayload(hostId);
  const rows = await loadPaidBookings(hostId);
  const included = paidBookingIds(stored);
  const txs = await mapTransactions(rows, settings, included);
  const pending = txs.filter((tx) => tx.payoutStatus === "pending" && tx.netEarnings > 0);
  if (pending.length === 0) return;

  const batch: HostPayoutRecord & { bookingIds: string[] } = {
    id: payoutId,
    paidDate,
    amount: Math.round(pending.reduce((s, tx) => s + tx.netEarnings, 0) * 100) / 100,
    currency: pending[0]?.currency ?? LAUNCH_CURRENCY,
    reference: payoutId.toUpperCase(),
    method: stored.payoutAccount?.method ?? "bank",
    status: "paid",
    bookingIds: pending.map((tx) => tx.id),
  };
  const next: StoredAccounts = {
    ...stored,
    paidBatches: [...(stored.paidBatches ?? []).filter((b) => b.id !== payoutId), batch],
  };
  await ensureHostUser(hostId);
  await prisma.hostAccounts.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(next) },
    update: { payload: JSON.stringify(next) },
  });
}

export async function getHostAccountsData(hostId: string): Promise<HostAccountsData> {
  const settings = await getFinancialSettingsFromDb();
  const stored = await getHostAccountsPayload(hostId);
  const rows = await loadPaidBookings(hostId);
  const included = paidBookingIds(stored);
  const txs = await mapTransactions(rows, settings, included);
  const hostName = rows[0]?.listing.host.fullName || hostId;
  const upcoming = upcomingForHost(hostId, hostName, txs, settings);
  const history = historyForHost(hostId, stored, settings);

  return {
    hostId,
    payoutAccount: stored.payoutAccount,
    upcomingPayouts: upcoming
      ? [
          {
            id: upcoming.id,
            scheduledDate: upcoming.scheduledDate,
            amount: upcoming.amount,
            currency: upcoming.currency,
            status: upcoming.adminStatus === "processing" ? "processing" : "scheduled",
            bookingCount: upcoming.bookingCount,
          },
        ]
      : [],
    payoutHistory: history.map((p) => ({
      id: p.id,
      paidDate: p.scheduledDate,
      amount: p.amount,
      currency: p.currency,
      reference: p.id.toUpperCase(),
      method: stored.payoutAccount?.method ?? "bank",
      status: "paid" as const,
    })),
    transactions: txs.map((tx) => {
      const { hostId, hostName, ...rest } = tx;
      void hostId;
      void hostName;
      return rest;
    }),
    invoices: history.map((p) => ({
      id: `inv-${p.id}`,
      invoiceNumber: p.id.toUpperCase(),
      date: p.scheduledDate,
      guestName: `${p.bookingCount} booking${p.bookingCount === 1 ? "" : "s"}`,
      property: "Payout",
      currency: p.currency,
      netAmount: p.amount,
      bookingRef: p.id,
    })),
  };
}

export type PlatformLedger = {
  transactions: AdminTransactionRow[];
  payouts: AdminPayoutItem[];
  refunds: RefundRequest[];
  report: FinancialReport;
  hosts: FinancialHostOption[];
};

/** All hosts with listings or a host role — not limited to paid bookings. */
export async function listFinancialHostsFromDb(): Promise<FinancialHostOption[]> {
  const byId = new Map<string, FinancialHostOption>();

  const rows = await prisma.listing.findMany({
    select: {
      hostId: true,
      country: true,
      state: true,
      payload: true,
      host: { select: { fullName: true } },
    },
  });

  for (const row of rows) {
    if (!row.hostId?.trim()) continue;
    const meta = parseListingMeta(row.payload);
    const country = row.country?.trim() || meta.country || LAUNCH_COUNTRY_NAME;
    const state = row.state?.trim() || meta.state || "";
    const hostName = row.host.fullName?.trim() || resolveHostName(row.hostId);
    const existing = byId.get(row.hostId);
    const next: FinancialHostOption = existing
      ? mergeFinancialHostOption(existing, {
          hostId: row.hostId,
          hostName,
          country,
          ...(state ? { state } : {}),
        })
      : {
          hostId: row.hostId,
          hostName,
          country,
          ...(state ? { state, states: [state] } : {}),
          countries: [country],
        };
    byId.set(row.hostId, next);
  }

  const users = await prisma.user.findMany({
    where: { roles: { contains: "host" } },
    select: { id: true, fullName: true },
  });
  for (const user of users) {
    const hostName = user.fullName?.trim() || resolveHostName(user.id);
    const existing = byId.get(user.id);
    if (existing) {
      if (hostName) existing.hostName = hostName;
      continue;
    }
    byId.set(user.id, {
      hostId: user.id,
      hostName,
      country: LAUNCH_COUNTRY_NAME,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.hostName.localeCompare(b.hostName));
}

export async function getPlatformLedger(): Promise<PlatformLedger> {
  const settings = await getFinancialSettingsFromDb();
  const rows = await loadPaidBookings();
  const hostIds = Array.from(new Set(rows.map((r) => r.listing.hostId)));
  const storedByHost = new Map<string, StoredAccounts>();
  await Promise.all(
    hostIds.map(async (hostId) => {
      storedByHost.set(hostId, await getHostAccountsPayload(hostId));
    })
  );

  const pricingCache: PricingCache = new Map();
  const transactions = await Promise.all(
    rows.map((row) => {
      const included = paidBookingIds(storedByHost.get(row.listing.hostId) ?? { payoutAccount: null });
      return toTransaction(row, settings, included, pricingCache);
    })
  );

  const payouts: AdminPayoutItem[] = [];
  const bookingHosts: FinancialHostOption[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const hostId = row.listing.hostId;
    if (seen.has(hostId)) continue;
    seen.add(hostId);
    const stored = storedByHost.get(hostId) ?? { payoutAccount: null };
    const hostName = row.listing.host.fullName;
    const meta = parseListingMeta(row.listing.payload);
    bookingHosts.push({
      hostId,
      hostName,
      country: meta.country || LAUNCH_COUNTRY_NAME,
      ...(meta.state ? { state: meta.state } : {}),
    });
    const upcoming = upcomingForHost(hostId, hostName, transactions, settings);
    if (upcoming) payouts.push(upcoming);
    payouts.push(
      ...historyForHost(hostId, stored, settings).map((p) => ({ ...p, hostName }))
    );
  }

  const hosts = mergeFinancialHostOptions(bookingHosts, await listFinancialHostsFromDb());

  const refunds = refundsFromBookings(rows);
  const report = computeFinancialReport(transactions, payouts, refunds);
  let payoutTransferCosts = 0;
  for (const stored of storedByHost.values()) {
    for (const batch of stored.paidBatches ?? []) {
      payoutTransferCosts += batch.transferFee ?? 0;
    }
  }
  report.payoutTransferCosts = payoutTransferCosts;
  report.truePlatformMargin =
    report.platformRevenue - report.stripeFeesTotal - payoutTransferCosts;

  return {
    transactions,
    payouts: payouts.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
    refunds,
    report,
    hosts: hosts.sort((a, b) => a.hostName.localeCompare(b.hostName)),
  };
}
