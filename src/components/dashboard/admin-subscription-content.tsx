"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CreditCard, Loader2, PartyPopper, Trash2, UtensilsCrossed } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { AdminSubscribersPanel } from "@/components/dashboard/admin-subscribers-panel";
import { useAdminFinancial } from "@/lib/admin/use-admin-financial";
import type { DirectoryComboOffer, EventsSubscriptionPlan } from "@/lib/admin/financial-types";
import {
  DEFAULT_DINING_SUBSCRIPTION_PLANS,
  DEFAULT_DIRECTORY_COMBO_OFFER,
  DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
  EVENTS_SUBSCRIPTION_CURRENCY,
  eventsDirectoryIsFree,
  formatEventsPlanFee,
  type DirectoryVertical,
} from "@/lib/admin/events-subscription";
import { cn } from "@/lib/utils";
import { comboOfferSavings } from "@/lib/host/directory-space";

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function planSummary(plans: EventsSubscriptionPlan[]) {
  const activePlans = plans.filter((plan) => plan.active);
  const fees = activePlans.map((plan) => plan.yearlyFeeAed).filter((fee) => fee >= 0);
  return {
    activeTiers: activePlans.length,
    totalTiers: plans.length,
    cheapestFee: fees.length ? Math.min(...fees) : 0,
    topFee: fees.length ? Math.max(...fees) : 0,
  };
}

function formatFeeRange(cheapestFee: number, topFee: number): string {
  if (cheapestFee === topFee) return formatEventsPlanFee(cheapestFee);
  return `${formatEventsPlanFee(cheapestFee)} – ${formatEventsPlanFee(topFee)}`;
}

function PlanTierTable({
  vertical,
  plans,
  freeDuringLaunch,
  onChange,
  onSave,
}: {
  vertical: DirectoryVertical;
  plans: EventsSubscriptionPlan[];
  freeDuringLaunch: boolean;
  onChange: (next: EventsSubscriptionPlan[]) => void;
  onSave: (next: EventsSubscriptionPlan[]) => void;
}) {
  const isDining = vertical === "dining";
  const isEvents = vertical === "events";
  const listingLabel = isDining ? "Outlets" : "Venues";
  const addLabel = isDining ? "outlet tier" : "venue tier";
  const planKey = isDining ? "diningPlans" : "eventsPlans";
  const eventsGridClass =
    "grid grid-cols-2 sm:grid-cols-[minmax(140px,1fr)_90px_90px_120px_70px_36px] gap-2 items-center";
  const diningGridClass =
    "grid grid-cols-2 sm:grid-cols-[minmax(140px,1fr)_110px_120px_70px_36px] gap-2 items-center";

  function patchPlanDraft(index: number, patchValues: Partial<EventsSubscriptionPlan>) {
    onChange(plans.map((plan, i) => (i === index ? { ...plan, ...patchValues } : plan)));
  }

  function parseCapacityValue(raw: string): number | null {
    return raw.trim() ? Math.max(1, Number(raw) || 1) : null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-500">
          {isDining ? "Dining" : "Events"} yearly tiers ({EVENTS_SUBSCRIPTION_CURRENCY}){" "}
          {freeDuringLaunch && "(shown when launch pricing starts)"}
        </p>
        <button
          type="button"
          onClick={() => {
            const next = [
              ...plans,
              {
                id: `${vertical}-tier-${Date.now()}`,
                name: "New tier",
                maxListings: 1,
                maxSpaces: isEvents ? 1 : undefined,
                yearlyFeeAed: 0,
                active: true,
              },
            ];
            onChange(next);
            onSave(next);
          }}
          className="text-xs font-semibold text-green-800 hover:text-green-900"
        >
          + Add {addLabel}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        {isEvents ? (
          <div className="hidden sm:grid sm:grid-cols-[minmax(140px,1fr)_90px_90px_120px_70px_36px] gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <span>Tier name</span>
            <span>Venues</span>
            <span>Spaces / venue</span>
            <span>Yearly fee ({EVENTS_SUBSCRIPTION_CURRENCY})</span>
            <span>Active</span>
            <span />
          </div>
        ) : (
          <div className="hidden sm:grid sm:grid-cols-[minmax(140px,1fr)_110px_120px_70px_36px] gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <span>Tier name</span>
            <span>{listingLabel}</span>
            <span>Yearly fee ({EVENTS_SUBSCRIPTION_CURRENCY})</span>
            <span>Active</span>
            <span />
          </div>
        )}
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className={cn(
              "border-t border-gray-100 px-3 py-2.5",
              isEvents ? eventsGridClass : diningGridClass
            )}
          >
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Tier name
              </span>
              <input
                value={plan.name}
                onChange={(e) => patchPlanDraft(index, { name: e.target.value })}
                onBlur={() => onSave(plans)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {listingLabel}
              </span>
              <input
                type="number"
                min={0}
                placeholder="Unlimited"
                value={plan.maxListings ?? ""}
                onChange={(e) =>
                  patchPlanDraft(index, {
                    maxListings: parseCapacityValue(e.target.value),
                  })
                }
                onBlur={() => onSave(plans)}
                className={inputClass}
              />
            </div>

            {isEvents && (
              <div className="space-y-1">
                <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Spaces / venue
                </span>
                <input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={plan.maxSpaces ?? ""}
                  onChange={(e) =>
                    patchPlanDraft(index, {
                      maxSpaces: parseCapacityValue(e.target.value),
                    })
                  }
                  onBlur={() => onSave(plans)}
                  className={inputClass}
                />
              </div>
            )}

            <div className="space-y-1">
              <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Yearly fee
              </span>
              <input
                type="number"
                min={0}
                value={plan.yearlyFeeAed}
                onChange={(e) =>
                  patchPlanDraft(index, {
                    yearlyFeeAed: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                onBlur={() => onSave(plans)}
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={plan.active}
                onChange={(e) => {
                  const next = plans.map((p, i) =>
                    i === index ? { ...p, active: e.target.checked } : p
                  );
                  onChange(next);
                  onSave(next);
                }}
                className="w-4 h-4 accent-green-700"
              />
              <span className="sm:hidden">Active</span>
            </label>

            <button
              type="button"
              onClick={() => {
                const next = plans.filter((_, i) => i !== index);
                onChange(next);
                onSave(next);
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
        {isEvents ? (
          <>
            <strong>Venues</strong> = directory listings. <strong>Spaces</strong> = rentable areas
            (halls, lawns, etc.) across those venues. Leave empty for unlimited. Saved as{" "}
            <code className="text-[10px] bg-gray-100 px-1 rounded">{planKey}</code>.
          </>
        ) : (
          <>
            Set how many dining outlets each tier includes. Leave empty for unlimited. Saved as{" "}
            <code className="text-[10px] bg-gray-100 px-1 rounded">{planKey}</code>.
          </>
        )}
      </p>
    </div>
  );
}

type SubscriptionTab = "plans" | "subscribers";

export function AdminSubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: SubscriptionTab =
    searchParams.get("tab") === "subscribers" ? "subscribers" : "plans";
  const { ready, shared, settings, financialHosts, updateEventsSubscription } =
    useAdminFinancial();
  const [message, setMessage] = useState("");

  function setTab(next: SubscriptionTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "plans") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `/admin/subscription?${qs}` : "/admin/subscription");
  }
  const freeDuringLaunch = eventsDirectoryIsFree(settings.eventsSubscription);
  const [eventsPlanDrafts, setEventsPlanDrafts] = useState<EventsSubscriptionPlan[]>(
    () => settings.eventsSubscription?.eventsPlans ?? DEFAULT_EVENTS_SUBSCRIPTION_PLANS
  );
  const [diningPlanDrafts, setDiningPlanDrafts] = useState<EventsSubscriptionPlan[]>(
    () => settings.eventsSubscription?.diningPlans ?? DEFAULT_DINING_SUBSCRIPTION_PLANS
  );
  const [comboDraft, setComboDraft] = useState<DirectoryComboOffer>(
    () => settings.eventsSubscription?.comboOffer ?? DEFAULT_DIRECTORY_COMBO_OFFER
  );

  const storedEventsPlans = settings.eventsSubscription?.eventsPlans;
  const storedDiningPlans = settings.eventsSubscription?.diningPlans;
  const storedCombo = settings.eventsSubscription?.comboOffer;
  useEffect(() => {
    if (storedEventsPlans?.length) setEventsPlanDrafts(storedEventsPlans);
  }, [storedEventsPlans]);
  useEffect(() => {
    if (storedDiningPlans?.length) setDiningPlanDrafts(storedDiningPlans);
  }, [storedDiningPlans]);
  useEffect(() => {
    if (storedCombo) setComboDraft(storedCombo);
  }, [storedCombo]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const eventsSummary = useMemo(() => planSummary(eventsPlanDrafts), [eventsPlanDrafts]);
  const diningSummary = useMemo(() => planSummary(diningPlanDrafts), [diningPlanDrafts]);

  function saveEventsPlans(next: EventsSubscriptionPlan[]) {
    setEventsPlanDrafts(next);
    updateEventsSubscription({ eventsPlans: next });
    flash("Events tiers saved.");
  }

  function saveDiningPlans(next: EventsSubscriptionPlan[]) {
    setDiningPlanDrafts(next);
    updateEventsSubscription({ diningPlans: next });
    flash("Dining tiers saved.");
  }

  function saveComboOffer(next: DirectoryComboOffer) {
    setComboDraft(next);
    updateEventsSubscription({ comboOffer: next });
    flash("Combo offer saved.");
  }

  const comboSavings = useMemo(
    () => comboOfferSavings({ ...settings.eventsSubscription, comboOffer: comboDraft }),
    [settings.eventsSubscription, comboDraft]
  );

  if (!ready) {
    return (
              <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      
    );
  }

  return (
          <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Subscription</h2>
          <p className="text-gray-500 text-sm mt-1">
            Separate yearly subscriptions for Events venues and Dining outlets — enquiry-only
            directory listings with no booking commission. Settings sync to{" "}
            <Link href="/host/listings" className="text-green-700 font-medium hover:underline">
              Host → Listings
            </Link>
            , the list-property flow, and public directory visibility.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="flex gap-1 border-b border-gray-200">
          {(
            [
              { id: "plans" as const, label: "Plans & pricing" },
              { id: "subscribers" as const, label: "Subscribers" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === item.id
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "subscribers" ? <AdminSubscribersPanel /> : null}

        {tab === "plans" ? (
        <>
        <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
                Live wiring
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Controls whether approved Events and Dining listings appear on the public site without
                payment, and which yearly tiers hosts see when launch pricing starts. Each vertical has
                its own subscription expiry and listing capacity.
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white border border-green-100 text-green-800">
              {shared ? "Shared database" : "Local storage"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Launch mode</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {freeDuringLaunch ? "Free launch" : "Paid enforcement"}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Events tiers</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {eventsSummary.activeTiers} of {eventsSummary.totalTiers} active
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Events pricing</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {formatFeeRange(eventsSummary.cheapestFee, eventsSummary.topFee)}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Dining tiers</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {diningSummary.activeTiers} of {diningSummary.totalTiers} active
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Dining pricing</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {formatFeeRange(diningSummary.cheapestFee, diningSummary.topFee)}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Currency</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {EVENTS_SUBSCRIPTION_CURRENCY} yearly
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Launch mode",
              value: freeDuringLaunch ? "Free launch" : "Paid enforcement",
              icon: CalendarDays,
            },
            {
              label: "Events entry tier",
              value: formatEventsPlanFee(eventsSummary.cheapestFee),
              icon: PartyPopper,
            },
            {
              label: "Dining entry tier",
              value: formatEventsPlanFee(diningSummary.cheapestFee),
              icon: UtensilsCrossed,
            },
            { label: "Hosts in directory", value: financialHosts.length, icon: CreditCard },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-green-700" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    {s.label}
                  </p>
                </div>
                <p className="text-lg font-bold font-display text-gray-900 mt-1 truncate">{s.value}</p>
              </div>
            );
          })}
        </div>

        <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-green-700" />
            <h3 className="font-semibold text-gray-900">Events &amp; dining directory pricing</h3>
          </div>
          <p className="text-sm text-gray-500">
            Event venues and restaurants are enquiry-only directory listings — guests contact hosts
            directly, so there is no booking commission. Hosts pay a yearly{" "}
            <strong>Events</strong> plan, a yearly <strong>Dining</strong> plan, or one{" "}
            <strong>Events + Dining combo</strong>. Events plans control venue listings and rentable
            spaces; Dining plans control outlets.
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
                      ? "Directory listings are free — approved Events and Dining go public immediately."
                      : "Paid tiers enforced — hosts need an active Events, Dining, or combo subscription for that vertical to stay public."
                  );
                }}
                className="mt-0.5 w-4 h-4 accent-green-700"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Free during India launch
                </span>
                <span className="block text-xs text-gray-600 mt-0.5">
                  {freeDuringLaunch
                    ? "Approved Events and Dining listings appear publicly with no subscription. Turn this off when you start charging."
                    : "Only hosts with an active Events, Dining, or combo subscription appear publicly in that directory. Use the Subscribers tab to activate or renew access."}
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <PartyPopper className="w-4 h-4 text-green-700" />
              <h4 className="text-sm font-semibold text-gray-900">Events — venues &amp; spaces</h4>
            </div>
            <PlanTierTable
              vertical="events"
              plans={eventsPlanDrafts}
              freeDuringLaunch={freeDuringLaunch}
              onChange={setEventsPlanDrafts}
              onSave={saveEventsPlans}
            />
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-green-700" />
              <h4 className="text-sm font-semibold text-gray-900">Dining — outlet capacity</h4>
            </div>
            <PlanTierTable
              vertical="dining"
              plans={diningPlanDrafts}
              freeDuringLaunch={freeDuringLaunch}
              onChange={setDiningPlanDrafts}
              onSave={saveDiningPlans}
            />
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Events + Dining combo offer</h4>
                <p className="text-xs text-gray-600 mt-1">
                  One yearly bundle for hosts who list both a venue and a restaurant. Shown at the
                  top of the list-property subscription modal when this offer is enabled (including
                  during free launch, as a preferred tier).
                </p>
              </div>
              {comboSavings !== null && comboSavings > 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-900">
                  Saves {formatEventsPlanFee(comboSavings)} vs separate entry tiers
                </span>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={comboDraft.enabled && comboDraft.active}
                onChange={(e) => {
                  const next = {
                    ...comboDraft,
                    enabled: e.target.checked,
                    active: e.target.checked,
                  };
                  saveComboOffer(next);
                }}
                className="mt-0.5 w-4 h-4 accent-green-700"
              />
              <span className="text-sm text-gray-700">Offer combo pricing to hosts</span>
            </label>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Offer name
                </span>
                <input
                  value={comboDraft.name}
                  onChange={(e) => setComboDraft((prev) => ({ ...prev, name: e.target.value }))}
                  onBlur={() => saveComboOffer(comboDraft)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Yearly combo fee ({EVENTS_SUBSCRIPTION_CURRENCY})
                </span>
                <input
                  type="number"
                  min={0}
                  value={comboDraft.yearlyFeeAed}
                  onChange={(e) =>
                    setComboDraft((prev) => ({
                      ...prev,
                      yearlyFeeAed: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  onBlur={() => saveComboOffer(comboDraft)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 sm:col-span-2 lg:col-span-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </span>
                <input
                  value={comboDraft.description}
                  onChange={(e) =>
                    setComboDraft((prev) => ({ ...prev, description: e.target.value }))
                  }
                  onBlur={() => saveComboOffer(comboDraft)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Events venues included
                </span>
                <input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={comboDraft.eventsSpaces ?? ""}
                  onChange={(e) =>
                    setComboDraft((prev) => ({
                      ...prev,
                      eventsSpaces: e.target.value.trim()
                        ? Math.max(1, Number(e.target.value) || 1)
                        : null,
                    }))
                  }
                  onBlur={() => saveComboOffer(comboDraft)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Events spaces included
                </span>
                <input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={comboDraft.eventsHallSpaces ?? ""}
                  onChange={(e) =>
                    setComboDraft((prev) => ({
                      ...prev,
                      eventsHallSpaces: e.target.value.trim()
                        ? Math.max(1, Number(e.target.value) || 1)
                        : null,
                    }))
                  }
                  onBlur={() => saveComboOffer(comboDraft)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Dining outlets included
                </span>
                <input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={comboDraft.diningSpaces ?? ""}
                  onChange={(e) =>
                    setComboDraft((prev) => ({
                      ...prev,
                      diningSpaces: e.target.value.trim()
                        ? Math.max(1, Number(e.target.value) || 1)
                        : null,
                    }))
                  }
                  onBlur={() => saveComboOffer(comboDraft)}
                  className={inputClass}
                />
              </label>
            </div>
            <p className="text-[11px] text-gray-500">
              Default sample: {formatEventsPlanFee(comboDraft.yearlyFeeAed)}/year for{" "}
              {comboDraft.eventsSpaces ?? "unlimited"} venue
              {comboDraft.eventsSpaces === 1 ? "" : "s"},{" "}
              {comboDraft.eventsHallSpaces ?? "unlimited"} event space
              {comboDraft.eventsHallSpaces === 1 ? "" : "s"}, and{" "}
              {comboDraft.diningSpaces ?? "unlimited"} dining outlet
              {comboDraft.diningSpaces === 1 ? "" : "s"}.
            </p>
          </div>

          <p className="text-[11px] text-gray-400">
            Shown on list-property checkout and{" "}
            <Link href="/host/listings" className="text-green-700 hover:underline">
              Host → Listings
            </Link>
            . A host with two event venues and one restaurant needs an Events tier covering 2 venues
            (and their spaces) plus a Dining tier covering 1 outlet — or one combo that includes both.
          </p>

        </section>

        <p className="text-xs text-gray-500">
          Booking commission and payout settings remain under{" "}
          <Link
            href="/admin/financial?tab=commission"
            className="font-semibold text-green-800 hover:text-green-950"
          >
            Financial Control → Commission &amp; fees
          </Link>
          .
        </p>
        </>
        ) : null}
      </div>
    
  );
}
