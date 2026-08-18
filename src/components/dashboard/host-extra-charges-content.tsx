"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import { useHostExtraLibrary } from "@/lib/host/use-host-extra-library";
import {
  EXTRA_CHARGE_BILLING_LABELS,
  type ExtraChargeBilling,
} from "@/lib/admin/extra-charges-catalog-types";
import type { HostExtraChargeTemplate } from "@/lib/host/host-extra-charges-library-types";

export function HostExtraChargesContent() {
  const { user, loading } = useAuth();
  const hostId = resolveHostId(user);
  const { items, ready, add, update, remove } = useHostExtraLibrary(hostId);
  const [draft, setDraft] = useState({
    label: "",
    amount: "",
    billing: "per_stay" as ExtraChargeBilling,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    label: "",
    amount: "",
    billing: "per_stay" as ExtraChargeBilling,
  });
  const [message, setMessage] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function startEdit(item: HostExtraChargeTemplate) {
    setEditingId(item.id);
    setEditDraft({
      label: item.label,
      amount: String(item.amount),
      billing: item.billing,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editDraft.label.trim() || editDraft.amount === "") return;
    const ok = update(editingId, {
      label: editDraft.label.trim(),
      amount: Math.max(0, Number(editDraft.amount) || 0),
      billing: editDraft.billing,
    });
    if (!ok) {
      flash("Could not save — another extra may already use that name.");
      return;
    }
    flash(`“${editDraft.label.trim()}” updated.`);
    setEditingId(null);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.label.trim() || draft.amount === "") return;
    const created = add({
      label: draft.label.trim(),
      amount: Math.max(0, Number(draft.amount) || 0),
      billing: draft.billing,
    });
    if (!created) {
      flash("You already have an extra with that name.");
      return;
    }
    setDraft({ label: "", amount: "", billing: "per_stay" });
    flash(`“${created.label}” saved. Tag it on a listing under Pricing.`);
  }

  if (loading || !ready) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  if (!user || !hostId) {
    return (
      <HostDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Sign in as a host</h2>
          <p className="text-sm text-gray-500 mb-4">
            Your extra charges are private to your account.
          </p>
          <Link href="/host/login" className="text-green-700 font-semibold text-sm hover:underline">
            Host login
          </Link>
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-green-700" />
            Extra charges
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Create your own fees (breakfast, BBQ, extra bed, transfers, etc.). Each host has a
            private list — other hosts never see yours. Then tag which ones apply on{" "}
            <Link href="/host/pricing" className="text-green-700 font-medium hover:underline">
              Pricing
            </Link>{" "}
            for each listing.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Your saved extras</h3>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">
              No extras yet. Add your first one below — name, price, and how it’s billed.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) =>
                editingId === item.id ? (
                  <li
                    key={item.id}
                    className="border border-green-200 bg-green-50/30 rounded-xl px-4 py-3"
                  >
                    <form
                      onSubmit={handleSaveEdit}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2"
                    >
                      <input
                        value={editDraft.label}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, label: e.target.value }))
                        }
                        required
                        className="sm:col-span-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        aria-label="Extra name"
                      />
                      <input
                        type="number"
                        min={0}
                        value={editDraft.amount}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, amount: e.target.value }))
                        }
                        required
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        aria-label="Price"
                      />
                      <select
                        value={editDraft.billing}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            billing: e.target.value as ExtraChargeBilling,
                          }))
                        }
                        className="border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        aria-label="Billing"
                      >
                        {(Object.keys(EXTRA_CHARGE_BILLING_LABELS) as ExtraChargeBilling[]).map(
                          (key) => (
                            <option key={key} value={key}>
                              {EXTRA_CHARGE_BILLING_LABELS[key]}
                            </option>
                          )
                        )}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="submit"
                          className="flex-1 inline-flex items-center justify-center gap-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-3 py-2 rounded-xl"
                        >
                          <Check className="w-4 h-4" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
                          aria-label="Cancel edit"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">
                        {item.amount} · {EXTRA_CHARGE_BILLING_LABELS[item.billing]}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="p-2 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50"
                        aria-label={`Edit ${item.label}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          remove(item.id);
                          flash(`“${item.label}” deleted.`);
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${item.label}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}

          <form
            onSubmit={handleAdd}
            className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-4 gap-2"
          >
            <input
              value={draft.label}
              onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Breakfast"
              required
              className="sm:col-span-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              min={0}
              value={draft.amount}
              onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
              placeholder="Price"
              required
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={draft.billing}
              onChange={(e) =>
                setDraft((p) => ({ ...p, billing: e.target.value as ExtraChargeBilling }))
              }
              className="border border-gray-200 rounded-xl px-2 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {(Object.keys(EXTRA_CHARGE_BILLING_LABELS) as ExtraChargeBilling[]).map((key) => (
                <option key={key} value={key}>
                  {EXTRA_CHARGE_BILLING_LABELS[key]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>
        </section>

        <p className="text-xs text-gray-400">
          Tip: After saving extras here, open each listing in Pricing and tick the ones that
          apply.
        </p>
      </div>
    </HostDashboardShell>
  );
}
