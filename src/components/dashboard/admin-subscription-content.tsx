"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Trash2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { listFinancialHosts } from "@/lib/admin/financial-data";
import { useAdminFinancial } from "@/lib/admin/use-admin-financial";
import type { EventsSubscriptionPlan } from "@/lib/admin/financial-types";
import {
  DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
  eventsDirectoryIsFree,
} from "@/lib/admin/events-subscription";
import { cn } from "@/lib/utils";
import { addOneYearIso, isEventsSubscriptionActive } from "@/lib/host/events-subscription";
import type { HostPublicProfile } from "@/lib/host/host-profile-types";

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

export function AdminSubscriptionContent() {
  const { ready, settings, updateEventsSubscription } = useAdminFinancial();
  const [message, setMessage] = useState("");
  const freeDuringLaunch = eventsDirectoryIsFree(settings.eventsSubscription);
  const [planDrafts, setPlanDrafts] = useState<EventsSubscriptionPlan[]>(
    () => settings.eventsSubscription?.plans ?? DEFAULT_EVENTS_SUBSCRIPTION_PLANS
  );
  const [grantHostId, setGrantHostId] = useState("");

  const storedPlans = settings.eventsSubscription?.plans;
  useEffect(() => {
    if (storedPlans?.length) setPlanDrafts(storedPlans);
  }, [storedPlans]);

  const allHosts = useMemo(() => (ready ? listFinancialHosts() : []), [ready]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function patchPlanDraft(index: number, patchValues: Partial<EventsSubscriptionPlan>) {
    setPlanDrafts((prev) =>
      prev.map((plan, i) => (i === index ? { ...plan, ...patchValues } : plan))
    );
  }

  function savePlanDrafts() {
    updateEventsSubscription({ plans: planDrafts });
  }

  if (!ready) {
    return (
      <AdminDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </AdminDashboardShell>
    );
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Subscription</h2>
          <p className="text-gray-500 text-sm mt-1">
            Events and dining directory pricing, launch mode, and host access grants.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-green-700" />
            <h3 className="font-semibold text-gray-900">Events directory pricing</h3>
          </div>
          <p className="text-sm text-gray-500">
            Event venues are listed as a directory — guests contact them directly, so there is no
            booking commission. Hosts pay by how many venues they list.
          </p>

          <div
            className={cn(
              "rounded-xl border p-4",
              freeDuringLaunch ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
            )}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={freeDuringLaunch}
                onChange={(e) => {
                  updateEventsSubscription({ freeDuringLaunch: e.target.checked });
                  flash(
                    e.target.checked
                      ? "Events listings are now free — approved venues go public immediately."
                      : "Paid tiers enforced — venues need an active subscription to stay public."
                  );
                }}
                className="mt-0.5 w-4 h-4 accent-green-700"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Free during launch
                </span>
                <span className="block text-xs text-gray-600 mt-0.5">
                  {freeDuringLaunch
                    ? "Approved event venues appear publicly with no subscription. Turn this off when you start charging."
                    : "Only venues with an active subscription appear publicly. Grant subscriptions below."}
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">
                Yearly tiers {freeDuringLaunch && "(applied once launch pricing starts)"}
              </p>
              <button
                type="button"
                onClick={() => {
                  updateEventsSubscription({
                    plans: [
                      ...planDrafts,
                      {
                        id: `tier-${Date.now()}`,
                        name: "New tier",
                        maxListings: 25,
                        yearlyFeeAed: 0,
                        active: true,
                      },
                    ],
                  });
                  flash("Tier added.");
                }}
                className="text-xs font-semibold text-green-800 hover:text-green-900"
              >
                + Add tier
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="hidden sm:grid grid-cols-[1fr_120px_130px_80px_40px] gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <span>Tier name</span>
                <span>Max venues</span>
                <span>Yearly fee (AED)</span>
                <span>Active</span>
                <span />
              </div>
              {planDrafts.map((plan, index) => (
                <div
                  key={plan.id}
                  className="grid grid-cols-2 sm:grid-cols-[1fr_120px_130px_80px_40px] gap-2 items-center border-t border-gray-100 px-3 py-2.5"
                >
                  <input
                    value={plan.name}
                    onChange={(e) => patchPlanDraft(index, { name: e.target.value })}
                    onBlur={savePlanDrafts}
                    className={cn(inputClass, "col-span-2 sm:col-span-1")}
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Unlimited"
                    value={plan.maxListings ?? ""}
                    onChange={(e) =>
                      patchPlanDraft(index, {
                        maxListings: e.target.value.trim()
                          ? Math.max(1, Number(e.target.value) || 1)
                          : null,
                      })
                    }
                    onBlur={savePlanDrafts}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    value={plan.yearlyFeeAed}
                    onChange={(e) =>
                      patchPlanDraft(index, {
                        yearlyFeeAed: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    onBlur={savePlanDrafts}
                    className={inputClass}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={plan.active}
                      onChange={(e) => {
                        const next = planDrafts.map((p, i) =>
                          i === index ? { ...p, active: e.target.checked } : p
                        );
                        setPlanDrafts(next);
                        updateEventsSubscription({ plans: next });
                      }}
                      className="w-4 h-4 accent-green-700"
                    />
                    <span className="sm:hidden">Active</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = planDrafts.filter((_, i) => i !== index);
                      setPlanDrafts(next);
                      updateEventsSubscription({ plans: next });
                      flash("Tier removed.");
                    }}
                    aria-label={`Remove ${plan.name}`}
                    className="justify-self-end text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">
              Leave “Max venues” empty for an unlimited tier. A host is charged the cheapest tier
              that covers their number of event listings.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500">Grant 1 year to a host</p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <select
                value={grantHostId}
                onChange={(e) => setGrantHostId(e.target.value)}
                className={cn(inputClass, "flex-1")}
              >
                <option value="">Select host</option>
                {allHosts.map((h) => (
                  <option key={h.hostId} value={h.hostId}>
                    {h.hostName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!grantHostId}
                onClick={async () => {
                  if (!grantHostId) return;
                  const currentRes = await fetch(
                    `/api/hosts/${encodeURIComponent(grantHostId)}/profile`
                  );
                  const currentJson = currentRes.ok
                    ? ((await currentRes.json()) as { profile?: HostPublicProfile })
                    : null;
                  const existing = currentJson?.profile?.eventsSubscriptionExpiresAt;
                  const from = isEventsSubscriptionActive(existing)
                    ? new Date(existing as string)
                    : new Date();
                  const res = await fetch(
                    `/api/hosts/${encodeURIComponent(grantHostId)}/profile`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        eventsSubscriptionExpiresAt: addOneYearIso(from),
                      }),
                    }
                  );
                  if (!res.ok) {
                    flash("Could not grant Events subscription.");
                    return;
                  }
                  flash("Host Events subscription granted for 1 year.");
                }}
                className="text-sm font-semibold bg-gray-900 hover:bg-black disabled:opacity-50 text-white px-4 py-2 rounded-lg"
              >
                Grant 1 year
              </button>
            </div>
          </div>
        </section>

        <p className="text-xs text-gray-500">
          Commission and payout settings remain under{" "}
          <Link href="/admin/financial?tab=commission" className="font-semibold text-green-800 hover:text-green-950">
            Financial Control → Commission &amp; fees
          </Link>
          .
        </p>
      </div>
    </AdminDashboardShell>
  );
}
