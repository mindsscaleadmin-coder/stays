"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_DINING_SUBSCRIPTION_PLANS,
  DEFAULT_DIRECTORY_COMBO_OFFER,
  DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
  resolveDirectoryPlanForListingCount,
  type DirectoryVertical,
} from "@/lib/admin/events-subscription";
import type { DirectoryComboOffer, EventsSubscriptionPlan } from "@/lib/admin/financial-types";

interface PublicEventsSubscription {
  freeDuringLaunch: boolean;
  eventsPlans: EventsSubscriptionPlan[];
  diningPlans: EventsSubscriptionPlan[];
  comboOffer?: DirectoryComboOffer | null;
  plans?: EventsSubscriptionPlan[];
}

const DEFAULTS: PublicEventsSubscription = {
  freeDuringLaunch: true,
  eventsPlans: DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
  diningPlans: DEFAULT_DINING_SUBSCRIPTION_PLANS,
  comboOffer: DEFAULT_DIRECTORY_COMBO_OFFER,
};

let cachedSubscription: { at: number; data: PublicEventsSubscription } | null = null;
let subscriptionInflight: Promise<PublicEventsSubscription> | null = null;
const SUBSCRIPTION_CACHE_MS = 60_000;

async function fetchEventsSubscriptionSettings(): Promise<PublicEventsSubscription> {
  if (
    cachedSubscription &&
    Date.now() - cachedSubscription.at < SUBSCRIPTION_CACHE_MS
  ) {
    return cachedSubscription.data;
  }
  if (subscriptionInflight) return subscriptionInflight;

  subscriptionInflight = (async () => {
    try {
      const res = await fetch("/api/platform/events-subscription");
      if (!res.ok) return cachedSubscription?.data ?? DEFAULTS;
      const payload = (await res.json()) as PublicEventsSubscription;
      const data: PublicEventsSubscription = {
        freeDuringLaunch: payload.freeDuringLaunch !== false,
        eventsPlans: payload.eventsPlans?.length
          ? payload.eventsPlans
          : payload.plans?.length
            ? payload.plans
            : DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
        diningPlans: payload.diningPlans?.length
          ? payload.diningPlans
          : DEFAULT_DINING_SUBSCRIPTION_PLANS,
        comboOffer: payload.comboOffer ?? null,
      };
      cachedSubscription = { at: Date.now(), data };
      return data;
    } catch {
      return cachedSubscription?.data ?? DEFAULTS;
    }
  })().finally(() => {
    subscriptionInflight = null;
  });

  return subscriptionInflight;
}

/**
 * Directory pricing for host-facing screens — separate Events and Dining tiers.
 * Pass `{ enabled: false }` to skip the network fetch until the host listing flow opens.
 */
export function useEventsSubscriptionSettings(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<PublicEventsSubscription>(
    () => cachedSubscription?.data ?? DEFAULTS
  );
  const [ready, setReady] = useState(!enabled || !!cachedSubscription);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void fetchEventsSubscriptionSettings()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const settingsShape = {
    freeDuringLaunch: data.freeDuringLaunch,
    eventsPlans: data.eventsPlans,
    diningPlans: data.diningPlans,
    comboOffer: data.comboOffer ?? undefined,
    yearlyFeeAed: 0,
  };

  return {
    ready,
    freeDuringLaunch: data.freeDuringLaunch,
    eventsPlans: data.eventsPlans,
    diningPlans: data.diningPlans,
    comboOffer: data.comboOffer,
    /** @deprecated Use eventsPlans or diningPlans */
    plans: data.eventsPlans,
    plansForVertical: (vertical: DirectoryVertical) =>
      vertical === "dining" ? data.diningPlans : data.eventsPlans,
    planForListingCount: (count: number, vertical: DirectoryVertical = "events") =>
      resolveDirectoryPlanForListingCount(settingsShape, count, vertical),
  };
}
