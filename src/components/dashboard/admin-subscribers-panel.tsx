"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Loader2, Search } from "lucide-react";
import { useAdminSubscribers } from "@/lib/admin/use-admin-subscribers";
import type { AdminSubscriberFilter } from "@/lib/server/admin-subscribers-repo";
import { formatSubscriptionExpiry } from "@/lib/host/events-subscription";
import { cn } from "@/lib/utils";

const FILTERS: { id: AdminSubscriberFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "launch_free", label: "Launch free" },
  { id: "suggested", label: "Suggested to bill" },
  { id: "pending_payment", label: "Payment pending" },
  { id: "grace", label: "Grace period" },
  { id: "active", label: "Active paid" },
  { id: "expiring_soon", label: "Expiring soon" },
  { id: "expired", label: "Expired" },
];

const STATUS_STYLES: Record<string, string> = {
  launch_free: "bg-gray-100 text-gray-700",
  pending_payment: "bg-amber-100 text-amber-800",
  grace: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
};

export function AdminSubscribersPanel() {
  const [filter, setFilter] = useState<AdminSubscriberFilter>("all");
  const [search, setSearch] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const { rows, ready, error, busyHostId, patchSubscriber } = useAdminSubscribers(filter, search);

  return (
    <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Directory subscribers</h3>
        <p className="text-sm text-gray-500 mt-1">
          Enable billing per host when they are ready to pay. Use <strong>Activate 1 year</strong>{" "}
          after offline payment or as a free comp — it uses their preferred plan and records payment
          only when billing is already enabled for that host.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
              filter === f.id
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
            )}
          >
            {f.label}
            {f.id === "all" && ready ? ` (${rows.length})` : ""}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search host name or email…"
          className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      ) : null}

      {!ready ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-green-700" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-10 text-center">No hosts match this filter.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {rows.map((row) => {
            const notes = notesDraft[row.hostId] ?? row.notes;
            const busy = busyHostId === row.hostId;
            return (
              <div key={row.hostId} className="p-4 space-y-3 hover:bg-gray-50/60">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/hosts/${encodeURIComponent(row.hostId)}`}
                        className="font-semibold text-gray-900 hover:text-green-800"
                      >
                        {row.hostName}
                      </Link>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          STATUS_STYLES[row.billingStatus] ?? STATUS_STYLES.launch_free
                        )}
                      >
                        {row.billingStatusLabel}
                      </span>
                      {row.suggestedForBilling && row.billingStatus === "launch_free" && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Suggested
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{row.email || row.hostId}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      Joined {new Date(row.joinedAt).toLocaleDateString()} ·{" "}
                      {row.eventsListingCount} events · {row.diningListingCount} dining ·{" "}
                      {row.bookingCount} bookings
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Preferred plan:{" "}
                      <span className="font-medium">{row.preferredPlanId || "—"}</span>
                      {row.expiry ? (
                        <>
                          {" "}
                          · Expires {formatSubscriptionExpiry(row.expiry)}
                          {row.daysUntilExpiry !== null ? ` (${row.daysUntilExpiry}d)` : ""}
                        </>
                      ) : null}
                      {row.graceEndsAt ? (
                        <> · Grace until {formatSubscriptionExpiry(row.graceEndsAt)}</>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {!row.billingEnforced ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patchSubscriber(row.hostId, "enable_billing")}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                      >
                        Enable billing
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patchSubscriber(row.hostId, "disable_billing")}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Disable billing
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void patchSubscriber(row.hostId, "activate_year", {
                          planId: row.preferredPlanId || "events-single",
                        })
                      }
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white disabled:opacity-50"
                    >
                      Activate 1 year
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={notes}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [row.hostId]: e.target.value }))
                    }
                    placeholder="Follow-up notes (called, invoiced, bank transfer pending)…"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void patchSubscriber(row.hostId, "update_notes", { notes })
                    }
                    className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                  >
                    Save notes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
