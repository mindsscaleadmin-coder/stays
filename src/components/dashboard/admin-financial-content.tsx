"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe2,
  HandCoins,
  Loader2,
  MapPin,
  PauseCircle,
  Percent,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import {
  computeFinancialReport,
  filterPayoutsByHost,
  filterRefundsByHost,
  filterTransactionsByHost,
  hostMatchesFinancialLocationFilter,
} from "@/lib/admin/financial-data";
import { useAdminFinancial } from "@/lib/admin/use-admin-financial";
import { useAdminPlatformConfig } from "@/lib/admin/use-admin-platform-config";
import { eventsDirectoryIsFree } from "@/lib/admin/events-subscription";
import type {
  AdminPayoutItem,
  AdminTransactionRow,
  RefundRequest,
} from "@/lib/admin/financial-types";
import { cn } from "@/lib/utils";

type TabId = "reports" | "transactions" | "payouts" | "commission" | "tax" | "refunds";

const TABS: { id: TabId; label: string }[] = [
  { id: "reports", label: "Reports" },
  { id: "transactions", label: "Transactions" },
  { id: "payouts", label: "Payouts" },
  { id: "commission", label: "Commission & fees" },
  { id: "tax", label: "Tax config" },
  { id: "refunds", label: "Refund approvals" },
];

const TAB_WIRING: Record<TabId, string> = {
  reports:
    "Aggregates bookable stay/experience transactions. Events & Dining directory listings are enquiry-only — no booking commission in these totals.",
  transactions:
    "Live from host account ledgers (Shared DB) or demo seed data (local). Each row reflects gross, platform fee, tax pass-through, and host net.",
  payouts:
    "Approve, hold, or release host settlements. Held payouts block settlement until you release them.",
  commission:
    "Global fee applies to bookable listings at checkout. Per-host overrides win over global. Directory subscriptions are configured under Subscription.",
  tax:
    "Country tax rate and label sync to checkout and host pricing. India uses GST; values are stored in Admin → Countries.",
  refunds:
    "Cancellations queue refunds here for human review before Stripe moves money. Approve to issue the refund; reject to keep the payment.",
};

const PAYOUT_STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  held: "bg-red-100 text-red-700",
  processing: "bg-blue-100 text-blue-700",
  paid: "bg-gray-100 text-gray-600",
};

const REFUND_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString()}`;
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function sortCountriesIndiaFirst(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const aIndia = a.toLowerCase() === "india";
    const bIndia = b.toLowerCase() === "india";
    if (aIndia && !bIndia) return -1;
    if (!aIndia && bIndia) return 1;
    return a.localeCompare(b);
  });
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "green" | "blue" | "amber" | "purple";
}) {
  const tones = {
    default: "bg-white border-gray-200",
    green: "bg-green-50/80 border-green-100",
    blue: "bg-blue-50/80 border-blue-100",
    amber: "bg-amber-50/80 border-amber-100",
    purple: "bg-purple-50/80 border-purple-100",
  };
  const iconTones = {
    default: "text-gray-500 bg-gray-100",
    green: "text-green-700 bg-green-100",
    blue: "text-blue-700 bg-blue-100",
    amber: "text-amber-700 bg-amber-100",
    purple: "text-purple-700 bg-purple-100",
  };

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-xl font-bold font-display text-gray-900 mt-1">{value}</p>
          {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
        </div>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconTones[tone])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: AdminTransactionRow }) {
  return (
    <article className="bg-white rounded-xl border border-gray-100 p-4 hover:border-green-100 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">{tx.guestName}</p>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{tx.bookingRef}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {tx.property} · {tx.hostName} · {tx.date}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm shrink-0">
          <div className="text-end">
            <p className="text-[10px] uppercase text-gray-400">Gross</p>
            <p className="font-semibold">{formatMoney(tx.currency, tx.grossAmount)}</p>
          </div>
          <div className="text-end">
            <p className="text-[10px] uppercase text-gray-400">Fee ({tx.platformFeePct}%)</p>
            <p className="font-semibold text-purple-700">{formatMoney(tx.currency, tx.platformFee)}</p>
          </div>
          <div className="text-end">
            <p className="text-[10px] uppercase text-gray-400">Host net</p>
            <p className="font-semibold text-green-700">{formatMoney(tx.currency, tx.netEarnings)}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
            {tx.payoutStatus}
          </span>
        </div>
      </div>
    </article>
  );
}

function PayoutRow({
  payout,
  onApprove,
  onHold,
  onRelease,
}: {
  payout: AdminPayoutItem;
  onApprove: () => void;
  onHold: () => void;
  onRelease: () => void;
}) {
  const isPaid = payout.sourceStatus === "paid" || payout.adminStatus === "paid";

  return (
    <article className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">{payout.hostName}</p>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", PAYOUT_STATUS_STYLES[payout.adminStatus])}>
              {payout.adminStatus.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {payout.scheduledDate} · {payout.bookingCount} booking{payout.bookingCount === 1 ? "" : "s"}
          </p>
          {payout.holdReason && (
            <p className="text-xs text-red-600 mt-1.5 bg-red-50 border border-red-100 rounded-lg px-2 py-1 inline-block">
              Hold: {payout.holdReason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold text-green-700">{formatMoney(payout.currency, payout.amount)}</p>
          {!isPaid && (
            <div className="flex gap-2">
              {payout.adminStatus === "held" ? (
                <button type="button" onClick={onRelease} className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg">
                  Release hold
                </button>
              ) : (
                <>
                  <button type="button" onClick={onApprove} className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button type="button" onClick={onHold} className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                    <PauseCircle className="w-3.5 h-3.5" /> Hold
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function AdminFinancialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam! : "reports";
  const countryParam = searchParams.get("country") ?? "";
  const hostParam = searchParams.get("host") ?? "";

  const { data: taxonomy, saveCountry } = useAdminTaxonomy();
  const { config: platformConfig } = useAdminPlatformConfig();
  const {
    ready,
    shared,
    settings,
    financialHosts,
    transactions,
    payouts,
    refresh,
    updateGlobalCommission,
    setHostOverride,
    removeHostOverride,
    approvePayout,
    holdPayout,
    releasePayout,
    reviewRefund,
  } = useAdminFinancial();

  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [globalFee, setGlobalFee] = useState(String(settings.commission.globalFeePct));
  const [serviceFee, setServiceFee] = useState(String(settings.commission.globalServiceFeeFlat));
  const [overrideHostId, setOverrideHostId] = useState("");
  const [overrideHostName, setOverrideHostName] = useState("");
  const [overrideFee, setOverrideFee] = useState("10");
  const [overrideNote, setOverrideNote] = useState("");
  const [overridePickerQuery, setOverridePickerQuery] = useState("");
  const [overridePickerCountry, setOverridePickerCountry] = useState("");
  const [overridePickerState, setOverridePickerState] = useState("");

  useEffect(() => {
    setGlobalFee(String(settings.commission.globalFeePct));
    setServiceFee(String(settings.commission.globalServiceFeeFlat));
  }, [settings.commission.globalFeePct, settings.commission.globalServiceFeeFlat]);

  const taxonomyCountries = useMemo(
    () => filterActiveCountries(taxonomy.countries),
    [taxonomy.countries]
  );

  const allHosts = useMemo(() => financialHosts, [financialHosts]);

  const countryOptions = useMemo(() => {
    const names = new Set<string>();
    for (const c of taxonomyCountries) names.add(c.name);
    for (const h of allHosts) {
      if (h.country) names.add(h.country);
      for (const name of h.countries ?? []) {
        if (name) names.add(name);
      }
    }
    return sortCountriesIndiaFirst(Array.from(names));
  }, [taxonomyCountries, allHosts]);

  const overrideCountryOptions = useMemo(() => {
    const names = new Set<string>();
    for (const h of allHosts) {
      if (h.country.trim()) names.add(h.country.trim());
      for (const name of h.countries ?? []) {
        if (name.trim()) names.add(name.trim());
      }
    }
    if (names.size === 0) return countryOptions;
    return sortCountriesIndiaFirst(
      countryOptions.filter((name) => names.has(name))
    );
  }, [allHosts, countryOptions]);

  const hostsInCountry = useMemo(() => {
    if (!countryParam) return allHosts;
    const needle = countryParam.trim().toLowerCase();
    return allHosts.filter((h) => h.country.trim().toLowerCase() === needle);
  }, [allHosts, countryParam]);

  const hostFilter = useMemo(
    () => ({ country: countryParam || undefined, hostId: hostParam || undefined }),
    [countryParam, hostParam]
  );

  const scopedTransactions = useMemo(
    () => filterTransactionsByHost(transactions, hostFilter),
    [transactions, hostFilter]
  );

  const scopedPayouts = useMemo(
    () => filterPayoutsByHost(payouts, hostFilter),
    [payouts, hostFilter]
  );

  const scopedRefunds = useMemo(() => {
    const list = filterRefundsByHost(settings.refundRequests, hostFilter);
    return [...list].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
  }, [settings.refundRequests, hostFilter]);

  const report = useMemo(
    () => computeFinancialReport(scopedTransactions, scopedPayouts, scopedRefunds),
    [scopedTransactions, scopedPayouts, scopedRefunds]
  );

  const scopedPendingPayoutReviewCount = useMemo(
    () =>
      scopedPayouts.filter(
        (p) => p.adminStatus === "pending_review" && p.sourceStatus !== "paid"
      ).length,
    [scopedPayouts]
  );

  const scopedPendingRefundCount = useMemo(
    () => scopedRefunds.filter((r) => r.status === "pending").length,
    [scopedRefunds]
  );

  const commissionBounds = platformConfig.features.hostBounds;
  const directoryFreeLaunch = eventsDirectoryIsFree(settings.eventsSubscription);
  const wiringSummary = useMemo(
    () => ({
      globalFee: settings.commission.globalFeePct,
      serviceFee: settings.commission.globalServiceFeeFlat,
      overrides: settings.commission.hostOverrides.length,
      pendingPayouts: scopedPendingPayoutReviewCount,
      pendingRefunds: scopedPendingRefundCount,
      txnCount: scopedTransactions.length,
    }),
    [
      settings.commission,
      scopedPendingPayoutReviewCount,
      scopedPendingRefundCount,
      scopedTransactions.length,
    ]
  );

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/admin/financial?${params.toString()}`);
    },
    [router, searchParams]
  );

  const setCountryFilter = useCallback(
    (country: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (country) params.set("country", country);
      else params.delete("country");
      params.delete("host");
      if (!params.get("tab")) params.set("tab", activeTab);
      router.replace(`/admin/financial?${params.toString()}`);
    },
    [router, searchParams, activeTab]
  );

  const setHostFilter = useCallback(
    (hostId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (hostId) params.set("host", hostId);
      else params.delete("host");
      if (!params.get("tab")) params.set("tab", activeTab);
      router.replace(`/admin/financial?${params.toString()}`);
    },
    [router, searchParams, activeTab]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scopedTransactions;
    return scopedTransactions.filter((tx) =>
      [tx.guestName, tx.hostName, tx.property, tx.bookingRef, tx.id]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [scopedTransactions, query]);

  const pendingPayouts = useMemo(
    () => scopedPayouts.filter((p) => p.sourceStatus !== "paid" && p.adminStatus !== "paid"),
    [scopedPayouts]
  );

  const scopedOverrides = useMemo(() => {
    if (!countryParam && !hostParam) return settings.commission.hostOverrides;
    const allowed = new Set(hostsInCountry.map((h) => h.hostId));
    return settings.commission.hostOverrides.filter((o) => {
      if (hostParam) return o.hostId === hostParam;
      return allowed.has(o.hostId);
    });
  }, [settings.commission.hostOverrides, countryParam, hostParam, hostsInCountry]);

  const overridePickerStateOptions = useMemo(() => {
    const countryName = overridePickerCountry.trim();
    if (!countryName) return [];

    const countryMatch = taxonomyCountries.find(
      (c) => c.name.trim().toLowerCase() === countryName.toLowerCase()
    );
    const fromTaxonomy = taxonomy.states
      .filter((s) => s.enabled !== false && (!countryMatch || s.countryId === countryMatch.id))
      .map((s) => s.name);
    const fromHosts = allHosts
      .filter((h) => hostMatchesFinancialLocationFilter(h, { country: countryName }))
      .flatMap((h) => [h.state?.trim(), ...(h.states ?? [])])
      .filter(
        (name): name is string =>
          typeof name === "string" && name.length > 0 && !fromTaxonomy.includes(name)
      );

    return [...fromTaxonomy, ...Array.from(new Set(fromHosts))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [allHosts, overridePickerCountry, taxonomyCountries, taxonomy.states]);

  const overrideLocationFilterActive = useMemo(
    () => Boolean(overridePickerCountry.trim()),
    [overridePickerCountry]
  );

  const hostsInOverrideRegion = useMemo(() => {
    const country = overridePickerCountry.trim();
    const state = overridePickerState.trim();

    if (!country) {
      return [...allHosts].sort((a, b) => a.hostName.localeCompare(b.hostName));
    }

    return allHosts
      .filter((h) =>
        hostMatchesFinancialLocationFilter(h, { country, state: state || undefined })
      )
      .sort((a, b) => a.hostName.localeCompare(b.hostName));
  }, [allHosts, overridePickerCountry, overridePickerState]);

  const hostsForOverridePicker = useMemo(() => {
    const queryNeedle = overridePickerQuery.trim().toLowerCase();
    const hasSearch = Boolean(queryNeedle);

    if (!hasSearch && !overrideLocationFilterActive) return [];

    let pool = overrideLocationFilterActive ? hostsInOverrideRegion : allHosts;

    if (hasSearch) {
      pool = pool.filter((h) => {
        const haystack = [h.hostName, h.hostId].join(" ").toLowerCase();
        return haystack.includes(queryNeedle);
      });
    }

    return pool.sort((a, b) => a.hostName.localeCompare(b.hostName));
  }, [
    allHosts,
    hostsInOverrideRegion,
    overridePickerQuery,
    overrideLocationFilterActive,
  ]);

  useEffect(() => {
    if (!overrideHostId) return;
    if (!hostsForOverridePicker.some((h) => h.hostId === overrideHostId)) {
      setOverrideHostId("");
      setOverrideHostName("");
    }
  }, [hostsForOverridePicker, overrideHostId]);

  function formatHostLocation(
    host: { state?: string; states?: string[]; country: string; countries?: string[] },
    filters?: { state?: string; country?: string }
  ): string {
    const state =
      filters?.state?.trim() ||
      host.state?.trim() ||
      host.states?.[0] ||
      "";
    const country =
      filters?.country?.trim() ||
      host.country.trim() ||
      host.countries?.[0] ||
      "";
    return [state, country].filter(Boolean).join(", ");
  }

  const overrideHostPickerReady =
    Boolean(overridePickerQuery.trim()) || overrideLocationFilterActive;

  function applyHostSelection(hostId: string) {
    const host =
      hostsForOverridePicker.find((h) => h.hostId === hostId) ??
      allHosts.find((h) => h.hostId === hostId);
    setOverrideHostId(hostId);
    setOverrideHostName(host?.hostName ?? "");
    if (!host) return;
    if (!overridePickerCountry.trim()) {
      const country = host.country.trim() || host.countries?.[0]?.trim() || "";
      if (country) setOverridePickerCountry(country);
    }
    if (!overridePickerState.trim()) {
      const state = host.state?.trim() || host.states?.[0]?.trim() || "";
      if (state) setOverridePickerState(state);
    }
  }

  if (!ready) {
    return (
              <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      
    );
  }

  return (
          <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">Financial Control</h2>
            <p className="text-gray-500 text-sm mt-1">
              Bookable stays and experiences — commission, GST, payouts, and refunds for India launch.
              Events and Dining directory listings are enquiry-only (no booking commission here).
              {(scopedPendingPayoutReviewCount > 0 || scopedPendingRefundCount > 0) && (
                <span className="text-amber-600 font-medium">
                  {scopedPendingPayoutReviewCount > 0 &&
                    ` ${scopedPendingPayoutReviewCount} payout${scopedPendingPayoutReviewCount === 1 ? "" : "s"} to review.`}
                  {scopedPendingRefundCount > 0 &&
                    ` ${scopedPendingRefundCount} refund${scopedPendingRefundCount === 1 ? "" : "s"} pending.`}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                refresh();
                flash("Financial data refreshed.");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="sr-only">Country</span>
              <select
                value={countryParam}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[180px]"
              >
                <option value="">All countries</option>
                {countryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span className="sr-only">Host</span>
              <select
                value={hostParam}
                onChange={(e) => setHostFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[180px]"
              >
                <option value="">
                  {countryParam ? "All hosts in country" : "All hosts"}
                </option>
                {hostsInCountry.map((h) => (
                  <option key={h.hostId} value={h.hostId}>
                    {h.hostName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        {shared && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            Shared database — commission, payouts, refunds, and ledger totals sync across admins and
            host accounts.
          </p>
        )}

        <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
                Live wiring
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Read-only snapshot of what this page controls. Commission and tax apply to bookable
                listings at checkout; directory subscriptions are managed under{" "}
                <Link href="/admin/subscription" className="text-green-700 font-medium hover:underline">
                  Subscription
                </Link>
                .
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white border border-green-100 text-green-800">
              {shared ? "Shared database" : "Local storage"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Global commission</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{wiringSummary.globalFee}%</p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Host overrides</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{wiringSummary.overrides}</p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Transactions</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{wiringSummary.txnCount}</p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Payouts to review</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{wiringSummary.pendingPayouts}</p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Pending refunds</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{wiringSummary.pendingRefunds}</p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Directory launch</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {directoryFreeLaunch ? "Free" : "Paid tiers"}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 border-b pb-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-green-700 text-green-800 bg-green-50/80"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {tab.label}
              {tab.id === "payouts" && scopedPendingPayoutReviewCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {scopedPendingPayoutReviewCount}
                </span>
              )}
              {tab.id === "refunds" && scopedPendingRefundCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {scopedPendingRefundCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          {TAB_WIRING[activeTab]}
        </p>

        {activeTab === "reports" && (
          <div className="space-y-5">
            <div className="overflow-x-auto pb-1">
              <div className="grid grid-cols-6 gap-2 w-full min-w-[720px]">
              <StatCard label="Platform revenue" value={formatMoney(report.currency, report.platformRevenue)} hint="Commission collected" icon={TrendingUp} tone="purple" />
              <StatCard label="Host earnings" value={formatMoney(report.currency, report.hostEarnings)} hint="Net to hosts" icon={HandCoins} tone="green" />
              <StatCard label="Tax collected" value={formatMoney(report.currency, report.taxCollected)} hint="VAT / GST pass-through" icon={Receipt} tone="blue" />
              <StatCard label="Stripe fees" value={formatMoney(report.currency, report.stripeFeesTotal ?? 0)} hint="Processing costs" icon={CreditCard} tone="amber" />
              <StatCard label="True margin" value={formatMoney(report.currency, report.truePlatformMargin ?? report.platformRevenue)} hint="Revenue − Stripe − bank costs" icon={TrendingUp} tone="purple" />
              <StatCard label="Outstanding payouts" value={formatMoney(report.currency, report.outstandingPayouts)} hint="Pending settlement" icon={Wallet} tone="amber" />
              <StatCard
                label="Transactions"
                value={String(report.transactionCount)}
                hint={countryParam || hostParam ? "Filtered host bookings" : "All host bookings"}
                icon={FileText}
              />
              <StatCard label="Pending refunds" value={String(report.pendingRefunds)} hint="Awaiting approval" icon={RefreshCw} tone="amber" />
              </div>
            </div>

            <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50/80">
                <h3 className="font-semibold text-gray-900">Revenue breakdown</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {countryParam || hostParam
                    ? "Aggregated from filtered host transactions"
                    : "Aggregated from all host account transactions"}
                </p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  ["Gross booking value", scopedTransactions.reduce((s, t) => s + t.grossAmount, 0)],
                  ["Platform commission", report.platformRevenue],
                  ["Tax (pass-through)", report.taxCollected],
                  ["Stripe processing fees", report.stripeFeesTotal ?? 0],
                  ["Bank transfer costs", report.payoutTransferCosts ?? 0],
                  ["True platform margin", report.truePlatformMargin ?? report.platformRevenue],
                  ["Host net earnings", report.hostEarnings],
                  ["Outstanding payouts", report.outstandingPayouts],
                ].map(([label, amount]) => (
                  <div key={label as string} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-semibold text-gray-900">{formatMoney(report.currency, amount as number)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search guest, host, property, booking ref…"
                  className={cn(inputClass, "ps-9")}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{filteredTransactions.length} transactions</p>
            </div>
            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">No transactions found.</div>
              ) : (
                filteredTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
              )}
            </div>
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="Pending review" value={String(scopedPendingPayoutReviewCount)} icon={SlidersHorizontal} tone="amber" />
              <StatCard label="On hold" value={String(scopedPayouts.filter((p) => p.adminStatus === "held").length)} icon={PauseCircle} tone="default" />
              <StatCard label="Outstanding" value={formatMoney(report.currency, report.outstandingPayouts)} icon={Banknote} tone="green" />
            </div>
            <div className="space-y-2">
              {pendingPayouts.length === 0 ? (
                <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">No pending payouts.</div>
              ) : (
                pendingPayouts.map((p) => (
                  <PayoutRow
                    key={`${p.hostId}-${p.id}`}
                    payout={p}
                    onApprove={() => {
                      approvePayout(p.id);
                      flash(`Payout for ${p.hostName} approved.`);
                    }}
                    onHold={() => {
                      const reason = prompt("Reason for holding payout (fraud check):") ?? "";
                      if (!reason.trim()) return;
                      holdPayout(p.id, reason.trim());
                      flash("Payout placed on hold.");
                    }}
                    onRelease={() => {
                      releasePayout(p.id);
                      flash("Payout hold released.");
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "commission" && (
          <div className="space-y-5">
            <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-green-700" />
                <h3 className="font-semibold text-gray-900">Global commission</h3>
              </div>
              <p className="text-sm text-gray-500">Default platform fee on bookable checkout (Stays & Experiences).</p>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Clamped to Platform Configuration → Host bounds:{" "}
                {commissionBounds.commissionFloorPct}% – {commissionBounds.commissionCeilingPct}%.
                Directory Events/Dining listings do not use this commission — they use yearly subscriptions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Commission %</span>
                  <input type="number" min={0} max={50} value={globalFee} onChange={(e) => setGlobalFee(e.target.value)} className={cn(inputClass, "mt-1")} />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Flat service fee</span>
                  <input type="number" min={0} value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} className={cn(inputClass, "mt-1")} />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateGlobalCommission(Number(globalFee) || 12, Number(serviceFee) || 0);
                  flash("Global commission updated.");
                }}
                className="text-sm font-semibold bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg"
              >
                Save global rates
              </button>
            </section>

            <section className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-gray-600">
                Events and Dining directory billing (Events, Dining, or combo yearly plans) is under{" "}
                <Link
                  href="/admin/subscription"
                  className="font-semibold text-green-800 hover:text-green-950"
                >
                  Subscription
                </Link>
                . No booking commission on directory enquiries.
              </p>
            </section>

            <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <HandCoins className="w-4 h-4 text-blue-700" />
                <h3 className="font-semibold text-gray-900">Per-host overrides</h3>
              </div>
              <p className="text-xs text-gray-500">
                Search by host name, or filter by country and state — then pick a host.
              </p>
              <div className="space-y-2">
                {scopedOverrides.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No host overrides for this filter.</p>
                ) : (
                  scopedOverrides.map((o) => {
                    const hostMeta = allHosts.find((h) => h.hostId === o.hostId);
                    const location = hostMeta ? formatHostLocation(hostMeta) : "";
                    return (
                    <div key={o.hostId} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{o.hostName}</p>
                        <p className="text-xs text-gray-500">
                          {o.feePct}% {o.note ? `· ${o.note}` : ""}
                          {location ? ` · ${location}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeHostOverride(o.hostId);
                          flash("Override removed.");
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    );
                  })
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!overrideHostId.trim() || !overrideHostName.trim()) return;
                  setHostOverride({
                    hostId: overrideHostId.trim(),
                    hostName: overrideHostName.trim(),
                    feePct: Number(overrideFee) || settings.commission.globalFeePct,
                    note: overrideNote.trim() || undefined,
                  });
                  setOverrideHostId("");
                  setOverrideHostName("");
                  setOverrideNote("");
                  flash("Host override saved.");
                }}
                className="border-t pt-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-500">1. Search host</span>
                    <div className="relative mt-1">
                      <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={overridePickerQuery}
                        onChange={(e) => {
                          setOverridePickerQuery(e.target.value);
                          setOverrideHostId("");
                          setOverrideHostName("");
                        }}
                        placeholder="Search by name…"
                        className={cn(inputClass, "ps-9")}
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-500">2. Country (optional)</span>
                    <select
                      value={overridePickerCountry}
                      onChange={(e) => {
                        setOverridePickerCountry(e.target.value);
                        setOverridePickerState("");
                        setOverrideHostId("");
                        setOverrideHostName("");
                      }}
                      className={cn(inputClass, "mt-1")}
                      disabled={overrideCountryOptions.length === 0}
                    >
                      <option value="">All countries</option>
                      {overrideCountryOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-500">3. State (optional)</span>
                    <select
                      value={overridePickerState}
                      onChange={(e) => {
                        setOverridePickerState(e.target.value);
                        setOverrideHostId("");
                        setOverrideHostName("");
                      }}
                      className={cn(inputClass, "mt-1")}
                      disabled={
                        !overridePickerCountry.trim() || overridePickerStateOptions.length === 0
                      }
                    >
                      <option value="">
                        {!overridePickerCountry.trim()
                          ? "Select country first"
                          : overridePickerStateOptions.length === 0
                            ? "No states for this country"
                            : "All states"}
                      </option>
                      {overridePickerStateOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">4. Host</span>
                  <select
                    value={overrideHostId}
                    onChange={(e) => applyHostSelection(e.target.value)}
                    className={cn(inputClass, "mt-1")}
                    required
                    disabled={!overrideHostPickerReady}
                  >
                    <option value="" disabled>
                      {!overrideHostPickerReady
                        ? "Search by name or filter by location first"
                        : hostsForOverridePicker.length === 0
                          ? "No hosts match"
                          : "Select host…"}
                    </option>
                    {hostsForOverridePicker.map((h) => {
                      const location = formatHostLocation(h);
                      return (
                        <option key={h.hostId} value={h.hostId}>
                          {h.hostName}
                          {location ? ` · ${location}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <p className="text-xs text-gray-500">
                  {overridePickerQuery.trim() && overrideLocationFilterActive
                    ? `${hostsForOverridePicker.length} host${
                        hostsForOverridePicker.length === 1 ? "" : "s"
                      } match "${overridePickerQuery.trim()}" in${
                        overridePickerState.trim()
                          ? ` ${overridePickerState}, ${overridePickerCountry}`
                          : ` ${overridePickerCountry}`
                      }.`
                    : overridePickerQuery.trim()
                      ? `${hostsForOverridePicker.length} host${
                          hostsForOverridePicker.length === 1 ? "" : "s"
                        } match "${overridePickerQuery.trim()}".`
                      : overrideLocationFilterActive
                        ? `${hostsForOverridePicker.length} host${
                            hostsForOverridePicker.length === 1 ? "" : "s"
                          } in${
                            overridePickerState.trim()
                              ? ` ${overridePickerState}, ${overridePickerCountry}`
                              : ` ${overridePickerCountry}`
                          }.`
                        : "Search by name or choose a country to list hosts."}
                  {allHosts.length === 0
                    ? " No hosts loaded yet — refresh or add listings with a host account."
                    : hostsForOverridePicker.length === 0 && overrideHostPickerReady
                      ? " No hosts match — try a different search or location."
                      : ""}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Fee %</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={overrideFee}
                  onChange={(e) => setOverrideFee(e.target.value)}
                  className={cn(inputClass, "mt-1")}
                />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Note (optional)</span>
                <input
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="e.g. Early partner rate"
                  className={cn(inputClass, "mt-1")}
                />
                </label>
                <div className="flex items-end">
                <button type="submit" className="inline-flex w-full items-center justify-center gap-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  <Plus className="w-4 h-4" /> Add override
                </button>
                </div>
                </div>
              </form>
            </section>
          </div>
        )}

        {activeTab === "tax" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3">
              <Globe2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Region-based tax rules</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Synced with Admin → Countries. Changes apply to host pricing and transaction tax lines.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {[...taxonomy.countries]
                .filter((c) => c.enabled !== false)
                .sort((a, b) => {
                  const aIndia = a.name.toLowerCase() === "india";
                  const bIndia = b.name.toLowerCase() === "india";
                  if (aIndia && !bIndia) return -1;
                  if (!aIndia && bIndia) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((country) => (
                <article key={country.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-2xl">{country.flag}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{country.name}</p>
                        <p className="text-xs text-gray-500">{country.code} · {country.currency}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase text-gray-400">Tax rate %</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={country.taxPct ?? 5}
                          onBlur={(e) => {
                            const taxPct = Number(e.target.value) || 0;
                            saveCountry({ ...country, taxPct });
                            flash(`Tax rate updated for ${country.name}.`);
                          }}
                          className={cn(inputClass, "mt-1")}
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-[10px] font-semibold uppercase text-gray-400">Tax label</span>
                        <input
                          defaultValue={country.taxLabel ?? (country.name === "India" ? "GST" : "VAT")}
                          onBlur={(e) => {
                            saveCountry({ ...country, taxLabel: e.target.value.trim() || "VAT" });
                            flash(`Tax label updated for ${country.name}.`);
                          }}
                          className={cn(inputClass, "mt-1")}
                          placeholder="VAT, GST, etc."
                        />
                      </label>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0", country.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {country.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === "refunds" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Manual refund approval is on</p>
              <p className="text-amber-800/90 mt-1">
                Policy refunds are held in this queue until you approve them. Review the amount and
                reason, then approve to send money via Stripe or reject to decline the refund.
              </p>
            </div>
            {scopedRefunds.length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
                No pending refunds — you&apos;re all caught up.
              </div>
            ) : (
              scopedRefunds.map((r: RefundRequest) => (
                <article key={r.id} className="bg-white rounded-2xl border p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900">{r.bookingRef}</h3>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", REFUND_STATUS_STYLES[r.status])}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{r.guestName} · {r.hostName}</p>
                      <p className="text-sm text-gray-700 mt-2">{r.reason}</p>
                      {r.reviewNote && (
                        <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-2">
                          {r.reviewNote}
                        </p>
                      )}
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-lg font-bold text-green-700">{r.amount}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Requested {new Date(r.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(`Approve refund of ${r.amount} for ${r.bookingRef}?`)) return;
                          reviewRefund(r.id, "approved", "Approved by admin");
                          flash("Refund approved — Stripe will process if configured.");
                        }}
                        className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-4 py-2 rounded-lg inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; issue refund
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const note = prompt("Rejection reason:") ?? "";
                          if (note === null) return;
                          reviewRefund(r.id, "rejected", note.trim() || "Rejected");
                          flash("Refund rejected — no money moved.");
                        }}
                        className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg"
                      >
                        Reject
                      </button>
                      <Link
                        href={`/admin/bookings?q=${encodeURIComponent(r.bookingRef)}`}
                        className="text-xs font-medium text-gray-500 hover:text-green-700 ms-auto"
                      >
                        View booking
                      </Link>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        )}
      </div>
    
  );
}
