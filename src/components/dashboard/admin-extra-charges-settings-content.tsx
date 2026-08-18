"use client";

import { useState } from "react";
import { Plus, ReceiptText, RotateCcw, Trash2 } from "lucide-react";
import { useExtraChargesCatalog } from "@/lib/admin/use-extra-charges-catalog";
import {
  EXTRA_CHARGE_BILLING_LABELS,
  type ExtraChargeBilling,
} from "@/lib/admin/extra-charges-catalog-types";

export function AdminExtraChargesSettingsContent() {
  const { ready, items, addItem, updateItem, removeItem, resetDefaults } =
    useExtraChargesCatalog();
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [billing, setBilling] = useState<ExtraChargeBilling>("per_stay");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    addItem({
      label: trimmed,
      defaultAmount: Math.max(0, Number(amount) || 0),
      defaultBilling: billing,
      enabled: true,
    });
    setLabel("");
    setAmount("");
    setBilling("per_stay");
    flash("Extra charge template added.");
  }

  if (!ready) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Extra charges</h2>
        <p className="text-gray-500 text-sm mt-1">
          Define charge templates hosts can attach on Pricing. Hosts pick from this list and can
          adjust amount or billing (per night, per day, or per stay).
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-green-700" />
            <h3 className="font-semibold text-gray-900">Charge templates</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              resetDefaults();
              flash("Restored default templates.");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-green-400 px-3 py-1.5 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
          </button>
        </div>

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
            >
              <label className="inline-flex items-center gap-2 shrink-0">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-xs text-gray-500">On</span>
              </label>
              <input
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                min={0}
                value={item.defaultAmount}
                onChange={(e) =>
                  updateItem(item.id, {
                    defaultAmount: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={item.defaultBilling}
                onChange={(e) =>
                  updateItem(item.id, {
                    defaultBilling: e.target.value as ExtraChargeBilling,
                  })
                }
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {(Object.keys(EXTRA_CHARGE_BILLING_LABELS) as ExtraChargeBilling[]).map((key) => (
                  <option key={key} value={key}>
                    {EXTRA_CHARGE_BILLING_LABELS[key]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!confirm(`Remove “${item.label}”?`)) return;
                  removeItem(item.id);
                  flash("Template removed.");
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                aria-label={`Remove ${item.label}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={handleAdd}
          className="border-t pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label e.g. Pet fee"
            required
            className="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Default amount"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <select
              value={billing}
              onChange={(e) => setBilling(e.target.value as ExtraChargeBilling)}
              className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {(Object.keys(EXTRA_CHARGE_BILLING_LABELS) as ExtraChargeBilling[]).map((key) => (
                <option key={key} value={key}>
                  {EXTRA_CHARGE_BILLING_LABELS[key]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="shrink-0 inline-flex items-center gap-1 text-sm bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-xl font-semibold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
