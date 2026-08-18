import { loadHostAccounts } from "@/lib/host/host-accounts-data";
import { clampCommissionPct } from "@/lib/admin/platform-config-data";
import { findCountryByListingName } from "@/lib/admin/country-utils";
import { loadTaxonomy } from "@/lib/admin/taxonomy-data";
import { loadAllUsers } from "@/lib/admin/user-data";
import { loadAllSubmissions } from "@/lib/listings/submission-data";
import type {
  AdminPayoutItem,
  AdminPayoutState,
  AdminTransactionRow,
  FinancialReport,
  FinancialSettings,
  HostCommissionOverride,
  RefundRequest,
} from "./financial-types";

import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-financial-settings";
export const FINANCIAL_SYNC_EVENT = "farm-stays-financial-updated";

const HOST_ACCOUNT_IDS = ["seed-host-4", "seed-host-5", "demo-host"];

const HOST_NAMES: Record<string, string> = {
  "seed-host-4": "Ahmed Al Farsi",
  "seed-host-5": "Sara Khan",
  "demo-host": "Demo Host",
};

/** Seed hosts without listing country → UAE for financial filtering demos */
const HOST_COUNTRY_FALLBACK: Record<string, string> = {
  "seed-host-4": "United Arab Emirates",
  "seed-host-5": "United Arab Emirates",
  "demo-host": "United Arab Emirates",
};

export type FinancialHostOption = {
  hostId: string;
  hostName: string;
  /** Listing / profile country name */
  country: string;
};

export type FinancialHostFilter = {
  /** Country name (taxonomy / listing). Empty = all. */
  country?: string;
  /** Host account id. Empty = all hosts (still scoped by country if set). */
  hostId?: string;
};

function normalizeCountryName(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function resolveCountryName(stored?: string): string {
  if (!stored?.trim()) return "";
  const taxonomy = loadTaxonomy();
  const match = findCountryByListingName(taxonomy.countries, stored);
  return match?.name ?? stored.trim();
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  commission: {
    globalFeePct: 12,
    globalServiceFeeFlat: 0,
    hostOverrides: [
      {
        hostId: "seed-host-5",
        hostName: "Sara Khan",
        feePct: 10,
        note: "Early partner rate",
      },
    ],
  },
  payoutStates: {
    "up-2": {
      adminStatus: "held",
      holdReason: "Fraud review — unusual payout velocity",
      reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  refundRequests: [
    {
      id: "rf-1",
      bookingRef: "GF-A8K2X1",
      guestName: "Priya Sharma",
      hostName: "Ahmed Al Farsi",
      amount: "AED 800",
      currency: "AED",
      reason: "Partial refund — pool unavailable during stay",
      status: "pending",
      requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "rf-2",
      bookingRef: "GF-L3P8R5",
      guestName: "Fatima Noor",
      hostName: "Ahmed Al Farsi",
      amount: "AED 2,280",
      currency: "AED",
      reason: "Full cancellation refund per policy",
      status: "approved",
      requestedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      reviewNote: "Approved — matches cancellation policy",
    },
  ],
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(FINANCIAL_SYNC_EVENT);
  }
}

function mergeSettings(parsed: Partial<FinancialSettings>): FinancialSettings {
  return {
    commission: {
      ...DEFAULT_FINANCIAL_SETTINGS.commission,
      ...parsed.commission,
      hostOverrides:
        parsed.commission?.hostOverrides?.length
          ? parsed.commission.hostOverrides
          : DEFAULT_FINANCIAL_SETTINGS.commission.hostOverrides,
    },
    payoutStates: parsed.payoutStates ?? DEFAULT_FINANCIAL_SETTINGS.payoutStates,
    refundRequests:
      parsed.refundRequests?.length
        ? parsed.refundRequests
        : DEFAULT_FINANCIAL_SETTINGS.refundRequests,
  };
}

export function loadFinancialSettings(): FinancialSettings {
  if (typeof window === "undefined") return DEFAULT_FINANCIAL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FINANCIAL_SETTINGS;
    return mergeSettings(JSON.parse(raw) as Partial<FinancialSettings>);
  } catch {
    return DEFAULT_FINANCIAL_SETTINGS;
  }
}

export function saveFinancialSettings(settings: FinancialSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  dispatchSync();
}

export function getPlatformCommissionPct(hostId?: string): number {
  const settings = loadFinancialSettings();
  if (hostId) {
    const override = settings.commission.hostOverrides.find((o) => o.hostId === hostId);
    if (override) return clampCommissionPct(override.feePct);
  }
  return clampCommissionPct(settings.commission.globalFeePct);
}

export function resolveHostName(hostId: string): string {
  return HOST_NAMES[hostId] ?? hostId;
}

export function collectHostAccountIds(): string[] {
  if (typeof window === "undefined") return HOST_ACCOUNT_IDS;
  const ids = new Set(HOST_ACCOUNT_IDS);
  try {
    const raw = localStorage.getItem("farm-stays-host-accounts");
    if (raw) {
      const map = JSON.parse(raw) as Record<string, unknown>;
      Object.keys(map).forEach((id) => ids.add(id));
    }
  } catch {
    /* ignore */
  }
  return Array.from(ids);
}

/** Hosts with country for Financial Control filters (listings → users → fallback). */
export function listFinancialHosts(): FinancialHostOption[] {
  const byId = new Map<string, FinancialHostOption>();

  for (const listing of loadAllSubmissions()) {
    if (!listing.hostId?.trim()) continue;
    const country =
      listing.country?.trim() ||
      HOST_COUNTRY_FALLBACK[listing.hostId] ||
      "United Arab Emirates";
    const existing = byId.get(listing.hostId);
    if (!existing) {
      byId.set(listing.hostId, {
        hostId: listing.hostId,
        hostName: listing.hostName?.trim() || resolveHostName(listing.hostId),
        country,
      });
    } else if (!existing.country && country) {
      existing.country = country;
    }
  }

  for (const user of loadAllUsers()) {
    if (!user.roles.includes("host")) continue;
    const country = resolveCountryName(user.country) || HOST_COUNTRY_FALLBACK[user.id] || "";
    const existing = byId.get(user.id);
    if (existing) {
      if (country && !existing.country) existing.country = country;
      if (user.name?.trim()) existing.hostName = user.name.trim();
      continue;
    }
    byId.set(user.id, {
      hostId: user.id,
      hostName: user.name?.trim() || resolveHostName(user.id),
      country: country || "United Arab Emirates",
    });
  }

  for (const hostId of collectHostAccountIds()) {
    if (byId.has(hostId)) continue;
    byId.set(hostId, {
      hostId,
      hostName: resolveHostName(hostId),
      country: HOST_COUNTRY_FALLBACK[hostId] || "United Arab Emirates",
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.hostName.localeCompare(b.hostName));
}

export function listFinancialHostCountries(): string[] {
  return Array.from(new Set(listFinancialHosts().map((h) => h.country).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  );
}

function hostMatchesFilter(host: FinancialHostOption, filter: FinancialHostFilter): boolean {
  if (filter.hostId && host.hostId !== filter.hostId) return false;
  if (filter.country) {
    if (normalizeCountryName(host.country) !== normalizeCountryName(filter.country)) {
      return false;
    }
  }
  return true;
}

export function hostIdsMatchingFilter(filter: FinancialHostFilter): Set<string> | null {
  const country = filter.country?.trim();
  const hostId = filter.hostId?.trim();
  if (!country && !hostId) return null;
  const matched = listFinancialHosts().filter((h) =>
    hostMatchesFilter(h, { country, hostId })
  );
  return new Set(matched.map((h) => h.hostId));
}

export function filterTransactionsByHost(
  transactions: AdminTransactionRow[],
  filter: FinancialHostFilter
): AdminTransactionRow[] {
  const ids = hostIdsMatchingFilter(filter);
  if (!ids) return transactions;
  return transactions.filter((tx) => ids.has(tx.hostId));
}

export function filterPayoutsByHost(
  payouts: AdminPayoutItem[],
  filter: FinancialHostFilter
): AdminPayoutItem[] {
  const ids = hostIdsMatchingFilter(filter);
  if (!ids) return payouts;
  return payouts.filter((p) => ids.has(p.hostId));
}

export function filterRefundsByHost(
  refunds: RefundRequest[],
  filter: FinancialHostFilter
): RefundRequest[] {
  const country = filter.country?.trim();
  const hostId = filter.hostId?.trim();
  if (!country && !hostId) return refunds;

  const hosts = listFinancialHosts().filter((h) =>
    hostMatchesFilter(h, { country, hostId })
  );
  const names = new Set(hosts.map((h) => h.hostName.trim().toLowerCase()));
  const ids = new Set(hosts.map((h) => h.hostId));

  return refunds.filter((r) => {
    if (hostId && ids.has(hostId)) {
      return names.has(r.hostName.trim().toLowerCase());
    }
    return names.has(r.hostName.trim().toLowerCase());
  });
}

export function aggregateAllTransactions(): AdminTransactionRow[] {
  const rows: AdminTransactionRow[] = [];
  for (const hostId of collectHostAccountIds()) {
    const accounts = loadHostAccounts(hostId);
    const hostName = resolveHostName(hostId);
    for (const tx of accounts.transactions) {
      rows.push({
        ...tx,
        hostId,
        hostName,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function aggregateAllPayouts(settings = loadFinancialSettings()): AdminPayoutItem[] {
  const items: AdminPayoutItem[] = [];

  for (const hostId of collectHostAccountIds()) {
    const accounts = loadHostAccounts(hostId);
    const hostName = resolveHostName(hostId);

    for (const p of accounts.upcomingPayouts) {
      const state = settings.payoutStates[p.id];
      const adminStatus =
        state?.adminStatus ??
        (p.status === "processing" ? "processing" : "pending_review");
      items.push({
        id: p.id,
        hostId,
        hostName,
        scheduledDate: p.scheduledDate,
        amount: p.amount,
        currency: p.currency,
        bookingCount: p.bookingCount,
        sourceStatus: p.status,
        adminStatus,
        holdReason: state?.holdReason,
      });
    }

    for (const p of accounts.payoutHistory) {
      const state = settings.payoutStates[p.id];
      items.push({
        id: p.id,
        hostId,
        hostName,
        scheduledDate: p.paidDate,
        amount: p.amount,
        currency: p.currency,
        bookingCount: 0,
        sourceStatus: "paid",
        adminStatus: state?.adminStatus ?? "paid",
        holdReason: state?.holdReason,
      });
    }
  }

  return items.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
}

export function computeFinancialReport(
  transactions = aggregateAllTransactions(),
  payouts = aggregateAllPayouts(),
  refunds?: RefundRequest[]
): FinancialReport {
  const currency = transactions[0]?.currency ?? "AED";
  const platformRevenue = transactions.reduce((sum, tx) => sum + tx.platformFee, 0);
  const hostEarnings = transactions.reduce((sum, tx) => sum + tx.netEarnings, 0);
  const taxCollected = transactions.reduce((sum, tx) => sum + tx.taxAmount, 0);
  const outstandingPayouts = payouts
    .filter((p) => p.adminStatus === "pending_review" || p.adminStatus === "approved" || p.adminStatus === "held")
    .filter((p) => p.sourceStatus !== "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const settings = loadFinancialSettings();
  const refundSource = refunds ?? settings.refundRequests;
  const pendingRefunds = refundSource.filter((r) => r.status === "pending").length;

  return {
    platformRevenue,
    hostEarnings,
    taxCollected,
    outstandingPayouts,
    pendingRefunds,
    currency,
    transactionCount: transactions.length,
  };
}

export function updatePayoutState(
  payoutId: string,
  state: AdminPayoutState
): FinancialSettings {
  const settings = loadFinancialSettings();
  const next: FinancialSettings = {
    ...settings,
    payoutStates: {
      ...settings.payoutStates,
      [payoutId]: { ...state, reviewedAt: new Date().toISOString() },
    },
  };
  saveFinancialSettings(next);
  return next;
}

export function updateCommissionSettings(
  updates: Partial<FinancialSettings["commission"]>
): FinancialSettings {
  const settings = loadFinancialSettings();
  const nextCommission = { ...settings.commission, ...updates };
  if (updates.globalFeePct !== undefined) {
    nextCommission.globalFeePct = clampCommissionPct(updates.globalFeePct);
  }
  if (updates.hostOverrides) {
    nextCommission.hostOverrides = updates.hostOverrides.map((o) => ({
      ...o,
      feePct: clampCommissionPct(o.feePct),
    }));
  }
  const next: FinancialSettings = {
    ...settings,
    commission: nextCommission,
  };
  saveFinancialSettings(next);
  return next;
}

export function upsertHostCommissionOverride(
  override: HostCommissionOverride
): FinancialSettings {
  const settings = loadFinancialSettings();
  const clamped = { ...override, feePct: clampCommissionPct(override.feePct) };
  const existing = settings.commission.hostOverrides.filter(
    (o) => o.hostId !== clamped.hostId
  );
  const next: FinancialSettings = {
    ...settings,
    commission: {
      ...settings.commission,
      hostOverrides: [...existing, clamped],
    },
  };
  saveFinancialSettings(next);
  return next;
}

export function removeHostCommissionOverride(hostId: string): FinancialSettings {
  const settings = loadFinancialSettings();
  const next: FinancialSettings = {
    ...settings,
    commission: {
      ...settings.commission,
      hostOverrides: settings.commission.hostOverrides.filter((o) => o.hostId !== hostId),
    },
  };
  saveFinancialSettings(next);
  return next;
}

export function reviewRefundRequest(
  id: string,
  input: { status: RefundRequest["status"]; reviewNote?: string }
): FinancialSettings {
  const settings = loadFinancialSettings();
  const next: FinancialSettings = {
    ...settings,
    refundRequests: settings.refundRequests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: input.status,
            reviewNote: input.reviewNote?.trim() || undefined,
            reviewedAt: new Date().toISOString(),
          }
        : r
    ),
  };
  saveFinancialSettings(next);
  return next;
}
