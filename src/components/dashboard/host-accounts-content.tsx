"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Building2,
  CalendarClock,
  Download,
  History,
  Loader2,
  Receipt,
  Smartphone,
  Wallet,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import { useHostAccounts } from "@/lib/host/use-host-accounts";
import { buildInvoiceText } from "@/lib/host/host-accounts-data";
import type { PayoutMethod } from "@/lib/host/host-accounts-types";
import { LAUNCH_CURRENCY } from "@/lib/tax/launch-market";
import { cn, formatPrice } from "@/lib/utils";

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function HostAccountsContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { data, ready, saveAccount } = useHostAccounts(hostId);
  const [message, setMessage] = useState("");

  const [method, setMethod] = useState<PayoutMethod>("bank");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);

  const currency = data?.transactions[0]?.currency ?? LAUNCH_CURRENCY;

  const upcomingTotal = useMemo(
    () => data?.upcomingPayouts.reduce((n, p) => n + p.amount, 0) ?? 0,
    [data?.upcomingPayouts]
  );

  const paidTotal = useMemo(
    () =>
      data?.payoutHistory
        .filter((p) => p.status === "paid")
        .reduce((n, p) => n + p.amount, 0) ?? 0,
    [data?.payoutHistory]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  useEffect(() => {
    const acct = data?.payoutAccount;
    if (!acct) return;
    setMethod(acct.method);
    setAccountHolder(acct.accountHolder);
    setBankName(acct.bankName ?? "");
    setAccountNumber(acct.accountNumber ?? "");
    setIban(acct.iban ?? "");
    setSwift(acct.swift ?? "");
    setUpiId(acct.upiId ?? "");
  }, [data?.payoutAccount]);

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountHolder.trim()) return;
    if (method === "bank" && !accountNumber.trim() && !iban.trim()) {
      flash("Enter an account number or IBAN.");
      return;
    }
    if (method === "upi" && !upiId.trim()) {
      flash("Enter a UPI ID.");
      return;
    }
    setSaving(true);
    try {
      await saveAccount({
        method,
        accountHolder: accountHolder.trim(),
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        iban: iban.trim() || undefined,
        swift: swift.trim() || undefined,
        upiId: upiId.trim() || undefined,
      });
      flash("Payout details saved.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not save payout details.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !data) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Accounts</h2>
          <p className="text-gray-500 text-sm mt-1">
            Payouts, earnings breakdown, bank or UPI setup, and invoices.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <CalendarClock className="w-3.5 h-3.5" />
              Upcoming
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(upcomingTotal, currency)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data.upcomingPayouts.length} scheduled payout
              {data.upcomingPayouts.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <History className="w-3.5 h-3.5" />
              Paid out
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatPrice(paidTotal, currency)}</p>
            <p className="text-xs text-gray-500 mt-1">Last 90 days</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <Wallet className="w-3.5 h-3.5" />
              Payout method
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {data.payoutAccount
                ? data.payoutAccount.method === "upi"
                  ? `UPI · ${data.payoutAccount.upiId}`
                  : `${data.payoutAccount.bankName ?? "Bank"} · ····${data.payoutAccount.accountNumber?.slice(-4) ?? "****"}`
                : "Not configured"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data.payoutAccount ? "Ready for payouts" : "Add details below"}
            </p>
          </div>
        </div>

        {/* Bank / UPI setup */}
        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Bank / UPI account</h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMethod("bank")}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors",
                method === "bank"
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
              )}
            >
              <Building2 className="w-4 h-4" /> Bank transfer
            </button>
            <button
              type="button"
              onClick={() => setMethod("upi")}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors",
                method === "upi"
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
              )}
            >
              <Smartphone className="w-4 h-4" /> UPI
            </button>
          </div>
          <form onSubmit={handleSaveAccount} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 mb-1 block">
                Account holder name
              </span>
              <input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            {method === "bank" ? (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">Bank name</span>
                  <input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Emirates NBD"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    Account number
                  </span>
                  <input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">IBAN</span>
                  <input
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    SWIFT / BIC
                  </span>
                  <input
                    value={swift}
                    onChange={(e) => setSwift(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
              </>
            ) : (
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-600 mb-1 block">UPI ID</span>
                <input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
            )}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                {saving ? "Updating…" : "Apply payout details"}
              </button>
            </div>
          </form>
        </section>

        {/* Upcoming + history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Upcoming payouts</h3>
            </div>
            {data.upcomingPayouts.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming payouts.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcomingPayouts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatPrice(p.amount, p.currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.scheduledDate} · {p.bookingCount} booking
                        {p.bookingCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        p.status === "processing"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Payout history</h3>
            </div>
            {data.payoutHistory.length === 0 ? (
              <p className="text-sm text-gray-400">No payouts yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.payoutHistory.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatPrice(p.amount, p.currency)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.paidDate} · {p.reference} ·{" "}
                        {p.method === "upi" ? "UPI" : "Bank"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                      {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Transaction breakdown */}
        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Transaction breakdown</h3>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="pb-2 pr-3 font-semibold">Booking</th>
                  <th className="pb-2 pr-3 font-semibold">Gross</th>
                  <th className="pb-2 pr-3 font-semibold">Platform fee</th>
                  <th className="pb-2 pr-3 font-semibold">Tax</th>
                  <th className="pb-2 pr-3 font-semibold">Net earnings</th>
                  <th className="pb-2 font-semibold">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-gray-900">{tx.guestName}</p>
                      <p className="text-xs text-gray-400">
                        {tx.property} · {tx.date}
                      </p>
                    </td>
                    <td className="py-3 pr-3 text-gray-700 whitespace-nowrap">
                      {formatPrice(tx.grossAmount, tx.currency)}
                    </td>
                    <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">
                      −{formatPrice(tx.platformFee, tx.currency)}{" "}
                      <span className="text-gray-400">({tx.platformFeePct}%)</span>
                    </td>
                    <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">
                      −{formatPrice(tx.taxAmount, tx.currency)}{" "}
                      <span className="text-gray-400">({tx.taxLabel})</span>
                    </td>
                    <td className="py-3 pr-3 font-semibold text-green-700 whitespace-nowrap">
                      {formatPrice(tx.netEarnings, tx.currency)}
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                          tx.payoutStatus === "paid" && "bg-green-100 text-green-700",
                          tx.payoutStatus === "included" && "bg-blue-100 text-blue-700",
                          tx.payoutStatus === "pending" && "bg-gray-100 text-gray-600"
                        )}
                      >
                        {tx.payoutStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invoices */}
        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Invoices & receipts</h3>
          </div>
          {data.invoices.length === 0 ? (
            <p className="text-sm text-gray-400">No invoices yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {inv.date} · {inv.property} · {inv.guestName} ·{" "}
                      {formatPrice(inv.netAmount, inv.currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadTextFile(
                        `${inv.invoiceNumber}.txt`,
                        buildInvoiceText(inv)
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-lg shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </HostDashboardShell>
  );
}
