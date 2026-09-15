"use client";

import { useEffect, useMemo } from "react";
import {
  Building2,
  Check,
  Infinity,
  Layers,
  MessageCircle,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import type { EventsSubscriptionPlan } from "@/lib/admin/financial-types";
import type { ListPropertyCategoryOption } from "@/lib/host/list-property";
import { formatEventsPlanCapacity } from "@/lib/admin/events-subscription";
import { useEventsSubscriptionSettings } from "@/lib/host/use-events-subscription-settings";
import { ModalPortal } from "@/components/ui/modal-portal";
import { cn } from "@/lib/utils";

function planIcon(plan: EventsSubscriptionPlan) {
  const id = plan.id.toLowerCase();
  const name = plan.name.toLowerCase();
  if (plan.maxListings === null || id === "unlimited" || name.includes("unlimited")) {
    return Infinity;
  }
  if (
    id === "portfolio" ||
    id === "small" ||
    name.includes("three") ||
    name.includes("3 propert")
  ) {
    return Layers;
  }
  return Building2;
}

function planTagline(plan: EventsSubscriptionPlan): string {
  const id = plan.id.toLowerCase();
  const name = plan.name.toLowerCase();
  if (plan.maxListings === null || id === "unlimited" || name.includes("unlimited")) {
    return "Scale without limits across your portfolio";
  }
  if (
    id === "portfolio" ||
    id === "small" ||
    name.includes("three") ||
    name.includes("3 propert")
  ) {
    return "Ideal for hosts managing several venues";
  }
  return "Best for a single venue or first listing";
}

function planFeatures(
  plan: EventsSubscriptionPlan,
  directoryLabel: string,
  isDining: boolean
): string[] {
  const capacity = formatEventsPlanCapacity(plan);
  const sectionLabel = isDining ? "Dining directory" : `${directoryLabel} section`;
  return [
    capacity,
    `Live in the public ${sectionLabel}`,
    "Direct guest enquiries — no booking fees",
    "Featured & Trending boosts available",
    "Yearly renewal — one subscription per host",
  ];
}

function resolvePopularPlanId(plans: EventsSubscriptionPlan[]): string | null {
  if (plans.length < 2) return null;
  const middle = plans[Math.floor(plans.length / 2)];
  return middle?.id ?? null;
}

export function ListPropertySubscriptionModal({
  open,
  category,
  onClose,
  onContinue,
}: {
  open: boolean;
  category: ListPropertyCategoryOption | null;
  onClose: () => void;
  onContinue: (planId: string) => void;
}) {
  const { ready, freeDuringLaunch, plans } = useEventsSubscriptionSettings();

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.active),
    [plans]
  );

  const popularPlanId = useMemo(
    () => resolvePopularPlanId(activePlans),
    [activePlans]
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !category) return null;

  const directoryLabel = category.label;
  const isDining = category.key === "dining";

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-950/60 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="list-property-subscription-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl rounded-t-2xl sm:rounded-2xl bg-white shadow-[0_28px_60px_-24px_rgba(27,67,50,0.35)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-gray-100 px-5 py-5 sm:px-8 sm:py-6">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-white to-green-50/40 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-900">
                {directoryLabel} directory
              </p>
              <h2
                id="list-property-subscription-title"
                className="font-display text-xl sm:text-2xl font-semibold text-gray-900 leading-tight mt-1"
              >
                Choose your plan
              </h2>
              <p className="text-sm text-gray-600 mt-2 max-w-xl">
                {isDining
                  ? "Dining listings appear in the public directory. Guests enquire directly — no booking fees."
                  : "Event venues appear in the public Events section. Guests enquire directly — no booking fees."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-gray-400 border border-transparent hover:border-gray-200 hover:bg-white hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-8 space-y-5">
          {!ready ? (
            <p className="text-sm text-gray-400">Loading plans…</p>
          ) : freeDuringLaunch ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <strong>Free during launch</strong> — list your {directoryLabel.toLowerCase()} listing
              now at no cost. Select a plan below so we know your preferred tier when paid pricing
              begins.
            </div>
          ) : null}

          <div
            className={cn(
              "flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch",
              activePlans.length <= 1 && "max-w-md mx-auto w-full"
            )}
          >
            {activePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                directoryLabel={directoryLabel}
                isDining={isDining}
                popular={plan.id === popularPlanId}
                freeDuringLaunch={freeDuringLaunch}
                compact={activePlans.length >= 4}
                onSelect={() => onContinue(plan.id)}
              />
            ))}
          </div>

          {!freeDuringLaunch && (
            <p className="text-xs text-gray-500 text-center sm:text-start">
              After you submit your listing, contact support to activate your subscription. Featured
              and Trending boosts are available once your plan is active.
            </p>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function PlanCard({
  plan,
  directoryLabel,
  isDining,
  popular,
  freeDuringLaunch,
  compact = false,
  onSelect,
}: {
  plan: EventsSubscriptionPlan;
  directoryLabel: string;
  isDining: boolean;
  popular: boolean;
  freeDuringLaunch: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  const Icon = planIcon(plan);
  const features = planFeatures(plan, directoryLabel, isDining);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex h-full min-w-0 flex-1 flex-col rounded-2xl border text-start transition-all",
        compact ? "p-3.5 sm:p-4" : "p-5",
        "border-gray-200 bg-white hover:border-green-400 hover:shadow-sm"
      )}
    >
      {popular && (
        <span className="absolute -top-2.5 start-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          Most popular
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className={cn("space-y-1", compact ? "mt-3" : "mt-4")}>
        <p className={cn("font-semibold text-gray-900", compact ? "text-sm" : "text-base")}>
          {plan.name}
        </p>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{planTagline(plan)}</p>
      </div>

      <div
        className={cn(
          "border-b border-gray-200/80",
          compact ? "mt-3 pb-3" : "mt-4 pb-4"
        )}
      >
        {freeDuringLaunch ? (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-400 line-through tabular-nums">
              AED {plan.yearlyFeeAed.toLocaleString()}/year
            </p>
            <p
              className={cn(
                "font-bold text-green-700 tabular-nums",
                compact ? "text-xl" : "text-2xl"
              )}
            >
              Free now
            </p>
            <p className="text-[10px] text-gray-500">Paid tier when launch pricing begins</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p
              className={cn(
                "font-bold text-gray-900 tabular-nums",
                compact ? "text-xl" : "text-2xl"
              )}
            >
              AED {plan.yearlyFeeAed.toLocaleString()}
              <span className="text-xs font-semibold text-gray-500">/year</span>
            </p>
            <p className="text-[10px] text-gray-500">Billed annually per host account</p>
          </div>
        )}
      </div>

      <ul className={cn("flex-1", compact ? "mt-3 space-y-2" : "mt-4 space-y-2.5")}>
        {features.map((feature, index) => (
          <li
            key={feature}
            className={cn(
              "flex items-start gap-1.5 text-gray-600",
              compact ? "text-[10px]" : "text-xs"
            )}
          >
            <FeatureIcon index={index} compact={compact} />
            <span className="leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>

      <p
        className={cn(
          "w-full rounded-xl py-2 text-center text-xs font-semibold transition-colors",
          compact ? "mt-4" : "mt-5",
          "bg-gray-100 text-gray-700 group-hover:bg-green-700 group-hover:text-white"
        )}
      >
        Select plan
      </p>
    </button>
  );
}

function FeatureIcon({
  index,
  compact = false,
}: {
  index: number;
  compact?: boolean;
}) {
  const className = cn(
    "shrink-0 mt-0.5 text-gray-400",
    compact ? "h-3 w-3" : "h-3.5 w-3.5"
  );

  if (index === 0) return <Building2 className={className} />;
  if (index === 1) return <MessageCircle className={className} />;
  if (index === 2) return <Check className={className} strokeWidth={2.5} />;
  if (index === 3) return <Sparkles className={className} />;
  return <TrendingUp className={className} />;
}
