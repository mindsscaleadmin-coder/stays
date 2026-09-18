import type {
  DirectoryComboOffer,
  EventsSubscriptionPlan,
  EventsSubscriptionSettings,
} from "@/lib/admin/financial-types";

/**
 * Events and Dining directory pricing — separate yearly subscriptions and listing
 * capacity per vertical. Both share the launch free toggle.
 */
export const EVENTS_SUBSCRIPTION_CURRENCY = "INR";

export type DirectoryVertical = "events" | "dining";

export const DEFAULT_EVENTS_SUBSCRIPTION_PLANS: EventsSubscriptionPlan[] = [
  {
    id: "events-single",
    name: "Single venue",
    maxListings: 1,
    maxSpaces: 3,
    yearlyFeeAed: 9999,
    active: true,
  },
  {
    id: "events-portfolio",
    name: "Three venues",
    maxListings: 3,
    maxSpaces: 10,
    yearlyFeeAed: 19999,
    active: true,
  },
  {
    id: "events-unlimited",
    name: "Unlimited venues",
    maxListings: null,
    maxSpaces: null,
    yearlyFeeAed: 39999,
    active: true,
  },
];

export const DEFAULT_DINING_SUBSCRIPTION_PLANS: EventsSubscriptionPlan[] = [
  {
    id: "dining-single",
    name: "Single outlet",
    maxListings: 1,
    yearlyFeeAed: 7999,
    active: true,
  },
  {
    id: "dining-portfolio",
    name: "Three outlets",
    maxListings: 3,
    yearlyFeeAed: 14999,
    active: true,
  },
  {
    id: "dining-unlimited",
    name: "Unlimited outlets",
    maxListings: null,
    yearlyFeeAed: 29999,
    active: true,
  },
];

export const DEFAULT_DIRECTORY_COMBO_OFFER: DirectoryComboOffer = {
  enabled: true,
  active: true,
  name: "Events + Dining combo",
  description: "One yearly price for both directory verticals — ideal for farm stays with a venue and restaurant.",
  yearlyFeeAed: 15999,
  eventsSpaces: 1,
  eventsHallSpaces: 3,
  diningSpaces: 1,
};

export const DEFAULT_EVENTS_SUBSCRIPTION: EventsSubscriptionSettings = {
  freeDuringLaunch: true,
  eventsPlans: DEFAULT_EVENTS_SUBSCRIPTION_PLANS.map((plan) => ({ ...plan })),
  diningPlans: DEFAULT_DINING_SUBSCRIPTION_PLANS.map((plan) => ({ ...plan })),
  comboOffer: { ...DEFAULT_DIRECTORY_COMBO_OFFER },
  yearlyFeeAed: 39999,
};

export function formatEventsPlanFee(
  amount: number,
  currency: string = EVENTS_SUBSCRIPTION_CURRENCY
): string {
  return `${currency} ${amount.toLocaleString("en-IN")}`;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num);
}

export function normalizeEventsSubscriptionPlans(
  plans: unknown,
  fallback: EventsSubscriptionPlan[] = DEFAULT_EVENTS_SUBSCRIPTION_PLANS
): EventsSubscriptionPlan[] {
  if (!Array.isArray(plans) || plans.length === 0) {
    return fallback.map((plan) => ({ ...plan }));
  }

  const normalized = plans
    .filter((plan): plan is Partial<EventsSubscriptionPlan> => Boolean(plan))
    .map((plan, index) => {
      const rawMax = plan.maxListings;
      const maxListings =
        rawMax === null || rawMax === undefined || Number(rawMax) <= 0
          ? null
          : Math.max(1, toPositiveInt(rawMax, 1));
      const rawSpaces = plan.maxSpaces;
      const maxSpaces =
        rawSpaces === null || rawSpaces === undefined || Number(rawSpaces) <= 0
          ? null
          : Math.max(1, toPositiveInt(rawSpaces, 1));
      return {
        id: String(plan.id ?? `tier-${index + 1}`),
        name: String(plan.name ?? "").trim() || `Tier ${index + 1}`,
        maxListings,
        maxSpaces,
        yearlyFeeAed: toPositiveInt(plan.yearlyFeeAed, 0),
        active: plan.active !== false,
      } satisfies EventsSubscriptionPlan;
    });

  return normalized.sort((a, b) => {
    if (a.maxListings === null) return 1;
    if (b.maxListings === null) return -1;
    return a.maxListings - b.maxListings;
  });
}

export function normalizeDirectoryComboOffer(
  parsed: Partial<DirectoryComboOffer> | undefined
): DirectoryComboOffer {
  const fallback = DEFAULT_DIRECTORY_COMBO_OFFER;
  const eventsSpacesRaw = parsed?.eventsSpaces;
  const eventsHallRaw = parsed?.eventsHallSpaces;
  const diningSpacesRaw = parsed?.diningSpaces;
  return {
    enabled: parsed?.enabled !== false,
    active: parsed?.active !== false,
    name: String(parsed?.name ?? fallback.name).trim() || fallback.name,
    description: String(parsed?.description ?? fallback.description).trim() || fallback.description,
    yearlyFeeAed: toPositiveInt(parsed?.yearlyFeeAed, fallback.yearlyFeeAed),
    eventsSpaces:
      eventsSpacesRaw === null || eventsSpacesRaw === undefined || Number(eventsSpacesRaw) <= 0
        ? null
        : Math.max(1, toPositiveInt(eventsSpacesRaw, 1)),
    eventsHallSpaces:
      eventsHallRaw === undefined
        ? fallback.eventsHallSpaces ?? 3
        : eventsHallRaw === null || Number(eventsHallRaw) <= 0
          ? null
          : Math.max(1, toPositiveInt(eventsHallRaw, fallback.eventsHallSpaces ?? 3)),
    diningSpaces:
      diningSpacesRaw === null || diningSpacesRaw === undefined || Number(diningSpacesRaw) <= 0
        ? null
        : Math.max(1, toPositiveInt(diningSpacesRaw, 1)),
  };
}

export function normalizeEventsSubscription(
  parsed: Partial<EventsSubscriptionSettings> | undefined
): EventsSubscriptionSettings {
  const legacyPlans = parsed?.plans?.length
    ? normalizeEventsSubscriptionPlans(parsed.plans)
    : null;
  const eventsPlans = normalizeEventsSubscriptionPlans(
    parsed?.eventsPlans ?? legacyPlans,
    DEFAULT_EVENTS_SUBSCRIPTION_PLANS
  );
  const diningPlans = normalizeEventsSubscriptionPlans(
    parsed?.diningPlans,
    DEFAULT_DINING_SUBSCRIPTION_PLANS
  );

  return {
    freeDuringLaunch: parsed?.freeDuringLaunch !== false,
    eventsPlans,
    diningPlans,
    comboOffer: normalizeDirectoryComboOffer(parsed?.comboOffer),
    plans: eventsPlans,
    yearlyFeeAed: toPositiveInt(
      parsed?.yearlyFeeAed,
      eventsPlans[eventsPlans.length - 1]?.yearlyFeeAed ??
        DEFAULT_EVENTS_SUBSCRIPTION.yearlyFeeAed
    ),
  };
}

export function getDirectoryPlans(
  settings: Partial<EventsSubscriptionSettings> | undefined,
  vertical: DirectoryVertical
): EventsSubscriptionPlan[] {
  const normalized = normalizeEventsSubscription(settings);
  return vertical === "dining" ? normalized.diningPlans : normalized.eventsPlans;
}

/** True while both directories are free — approval alone puts listings live. */
export function eventsDirectoryIsFree(
  settings: Pick<EventsSubscriptionSettings, "freeDuringLaunch"> | undefined
): boolean {
  return settings?.freeDuringLaunch !== false;
}

export function directoryVerticalLabel(vertical: DirectoryVertical): string {
  return vertical === "dining" ? "Dining" : "Events";
}

/** Host-facing capacity line under each plan name. */
export function formatEventsPlanCapacity(
  plan: Pick<EventsSubscriptionPlan, "id" | "name" | "maxListings" | "maxSpaces">,
  vertical: DirectoryVertical = "events"
): string {
  const unit = vertical === "dining" ? "outlet" : "venue";
  let listingLine = "";
  if (plan.maxListings === null) {
    listingLine = vertical === "dining" ? "Unlimited outlets" : "Unlimited venues";
  } else if (plan.maxListings === 1) {
    listingLine = `1 ${unit}`;
  } else {
    listingLine = `Up to ${plan.maxListings} ${unit}s`;
  }

  if (vertical !== "events") return listingLine;

  const spaces = plan.maxSpaces;
  if (spaces === null || spaces === undefined) {
    return `${listingLine} · unlimited spaces`;
  }
  if (spaces === 1) {
    const venues = plan.maxListings;
    if (venues !== null && venues > 1) {
      return `${listingLine} · up to 1 space each`;
    }
    return `${listingLine} · 1 space`;
  }

  const venues = plan.maxListings;
  if (venues !== null && venues > 1) {
    return `${listingLine} · up to ${spaces} spaces each`;
  }

  return `${listingLine} · up to ${spaces} spaces`;
}

/** Cheapest active tier that covers `listingCount` for one vertical. */
export function resolveDirectoryPlanForListingCount(
  settings: EventsSubscriptionSettings | undefined,
  listingCount: number,
  vertical: DirectoryVertical
): EventsSubscriptionPlan | null {
  const plans = getDirectoryPlans(settings, vertical).filter((plan) => plan.active);
  if (plans.length === 0) return null;
  const count = Math.max(1, Math.round(listingCount) || 1);
  return (
    plans.find((plan) => plan.maxListings === null || count <= plan.maxListings) ??
    plans[plans.length - 1]
  );
}

export function resolveDirectoryPlanFee(
  planId: string,
  settings: EventsSubscriptionSettings
): number {
  if (planId === "combo") {
    return settings.comboOffer?.yearlyFeeAed ?? 0;
  }
  const vertical: DirectoryVertical = planId.startsWith("dining-") ? "dining" : "events";
  const plan = getDirectoryPlans(settings, vertical).find((p) => p.id === planId);
  return plan?.yearlyFeeAed ?? 0;
}

/** @deprecated Use resolveDirectoryPlanForListingCount(settings, count, "events"). */
export function resolveEventsPlanForListingCount(
  settings: EventsSubscriptionSettings | undefined,
  listingCount: number
): EventsSubscriptionPlan | null {
  return resolveDirectoryPlanForListingCount(settings, listingCount, "events");
}
