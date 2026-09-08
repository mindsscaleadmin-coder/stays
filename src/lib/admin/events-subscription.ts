import type {
  EventsSubscriptionPlan,
  EventsSubscriptionSettings,
} from "@/lib/admin/financial-types";

/**
 * Events directory pricing.
 *
 * Launch phase is free: approved venues go public without paying, so the
 * directory fills up before anyone is charged. Once `freeDuringLaunch` is
 * turned off, hosts pay by how many venues they list — a single venue costs a
 * fraction of the unlimited tier.
 */
export const DEFAULT_EVENTS_SUBSCRIPTION_PLANS: EventsSubscriptionPlan[] = [
  { id: "single", name: "Single venue", maxListings: 1, yearlyFeeAed: 499, active: true },
  { id: "small", name: "Up to 3 venues", maxListings: 3, yearlyFeeAed: 1199, active: true },
  { id: "growth", name: "Up to 10 venues", maxListings: 10, yearlyFeeAed: 2499, active: true },
  { id: "unlimited", name: "Unlimited venues", maxListings: null, yearlyFeeAed: 4999, active: true },
];

export const DEFAULT_EVENTS_SUBSCRIPTION: EventsSubscriptionSettings = {
  freeDuringLaunch: true,
  plans: DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
  yearlyFeeAed: 4999,
};

function toPositiveInt(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num);
}

export function normalizeEventsSubscriptionPlans(
  plans: unknown
): EventsSubscriptionPlan[] {
  if (!Array.isArray(plans) || plans.length === 0) {
    return DEFAULT_EVENTS_SUBSCRIPTION_PLANS.map((plan) => ({ ...plan }));
  }

  const normalized = plans
    .filter((plan): plan is Partial<EventsSubscriptionPlan> => Boolean(plan))
    .map((plan, index) => {
      const rawMax = plan.maxListings;
      const maxListings =
        rawMax === null || rawMax === undefined || Number(rawMax) <= 0
          ? null
          : Math.max(1, toPositiveInt(rawMax, 1));
      return {
        id: String(plan.id ?? `tier-${index + 1}`),
        name: String(plan.name ?? "").trim() || `Tier ${index + 1}`,
        maxListings,
        yearlyFeeAed: toPositiveInt(plan.yearlyFeeAed, 0),
        active: plan.active !== false,
      } satisfies EventsSubscriptionPlan;
    });

  // Cheapest / smallest tier first; unlimited always last.
  return normalized.sort((a, b) => {
    if (a.maxListings === null) return 1;
    if (b.maxListings === null) return -1;
    return a.maxListings - b.maxListings;
  });
}

export function normalizeEventsSubscription(
  parsed: Partial<EventsSubscriptionSettings> | undefined
): EventsSubscriptionSettings {
  const plans = normalizeEventsSubscriptionPlans(parsed?.plans);
  return {
    freeDuringLaunch: parsed?.freeDuringLaunch !== false,
    plans,
    yearlyFeeAed: toPositiveInt(
      parsed?.yearlyFeeAed,
      plans[plans.length - 1]?.yearlyFeeAed ?? DEFAULT_EVENTS_SUBSCRIPTION.yearlyFeeAed
    ),
  };
}

/** True while the directory is free — approval alone puts an Event listing live. */
export function eventsDirectoryIsFree(
  settings: Pick<EventsSubscriptionSettings, "freeDuringLaunch"> | undefined
): boolean {
  return settings?.freeDuringLaunch !== false;
}

/** Cheapest active tier that covers `listingCount` venues. */
export function resolveEventsPlanForListingCount(
  settings: EventsSubscriptionSettings | undefined,
  listingCount: number
): EventsSubscriptionPlan | null {
  const plans = (settings?.plans ?? DEFAULT_EVENTS_SUBSCRIPTION_PLANS).filter(
    (plan) => plan.active
  );
  if (plans.length === 0) return null;
  const count = Math.max(1, Math.round(listingCount) || 1);
  return (
    plans.find((plan) => plan.maxListings === null || count <= plan.maxListings) ??
    plans[plans.length - 1]
  );
}
