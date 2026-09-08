"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
  resolveEventsPlanForListingCount,
} from "@/lib/admin/events-subscription";
import type { EventsSubscriptionPlan } from "@/lib/admin/financial-types";

interface PublicEventsSubscription {
  freeDuringLaunch: boolean;
  plans: EventsSubscriptionPlan[];
}

/**
 * Events directory pricing for host-facing screens. Defaults to the free launch
 * phase so hosts never see a paywall message before the settings load.
 */
export function useEventsSubscriptionSettings() {
  const [data, setData] = useState<PublicEventsSubscription>({
    freeDuringLaunch: true,
    plans: DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/platform/events-subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: PublicEventsSubscription | null) => {
        if (cancelled || !payload) return;
        setData({
          freeDuringLaunch: payload.freeDuringLaunch !== false,
          plans: payload.plans?.length ? payload.plans : DEFAULT_EVENTS_SUBSCRIPTION_PLANS,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready,
    freeDuringLaunch: data.freeDuringLaunch,
    plans: data.plans,
    planForListingCount: (count: number) =>
      resolveEventsPlanForListingCount(
        { ...data, yearlyFeeAed: 0 },
        count
      ),
  };
}
