import {
  getDirectoryPlans,
  normalizeEventsSubscription,
  resolveDirectoryPlanFee,
} from "@/lib/admin/events-subscription";
import type { EventsSubscriptionSettings } from "@/lib/admin/financial-types";
import { addOneYearIso, isEventsSubscriptionActive } from "@/lib/host/events-subscription";
import type { HostPublicProfile, HostPublicProfileInput } from "@/lib/host/host-profile-types";
import { getFinancialSettingsFromDb } from "@/lib/server/platform-catalog-repo";

export type GrantVertical = "events" | "dining" | "combo";

export function resolveGrantVerticalFromPlanId(planId: string): GrantVertical {
  if (planId === "combo") return "combo";
  if (planId.startsWith("dining-")) return "dining";
  return "events";
}

export function buildDirectorySubscriptionGrantPatch(
  profile: HostPublicProfile | null,
  planId: string,
  settings?: EventsSubscriptionSettings,
  paidAt = new Date(),
  options?: { recordPayment?: boolean }
): Partial<HostPublicProfileInput> {
  const normalized = normalizeEventsSubscription(settings);
  const vertical = resolveGrantVerticalFromPlanId(planId);
  const recordPayment = options?.recordPayment ?? true;
  const patch: Partial<HostPublicProfileInput> = {};
  if (recordPayment) {
    patch.directoryBillingPaidAt = paidAt.toISOString();
    patch.directoryBillingStatus = "active";
  }

  if (vertical === "combo") {
    const combo = normalized.comboOffer;
    const existing = profile?.directoryComboExpiresAt;
    const from = isEventsSubscriptionActive(existing) ? new Date(existing as string) : paidAt;
    const expires = addOneYearIso(from);
    patch.directoryComboExpiresAt = expires;
    patch.eventsSubscriptionExpiresAt = expires;
    patch.diningSubscriptionExpiresAt = expires;
    if (combo?.enabled && combo.active) {
      patch.eventsVenueSpaces = combo.eventsSpaces;
      patch.eventsHallSpaces = combo.eventsHallSpaces ?? null;
      patch.diningOutletSpaces = combo.diningSpaces;
    }
    return patch;
  }

  const plans = getDirectoryPlans(
    normalized,
    vertical === "dining" ? "dining" : "events"
  );
  const plan = plans.find((p) => p.id === planId) ?? plans.find((p) => p.active);

  if (vertical === "events") {
    const existing = profile?.eventsSubscriptionExpiresAt;
    const from = isEventsSubscriptionActive(existing) ? new Date(existing as string) : paidAt;
    patch.eventsSubscriptionExpiresAt = addOneYearIso(from);
    if (plan?.maxListings !== undefined) patch.eventsVenueSpaces = plan.maxListings;
    if (plan?.maxSpaces !== undefined) patch.eventsHallSpaces = plan.maxSpaces;
  } else {
    const existing = profile?.diningSubscriptionExpiresAt;
    const from = isEventsSubscriptionActive(existing) ? new Date(existing as string) : paidAt;
    patch.diningSubscriptionExpiresAt = addOneYearIso(from);
    if (plan?.maxListings !== undefined) patch.diningOutletSpaces = plan.maxListings;
  }

  return patch;
}

export async function loadDirectorySubscriptionSettings(): Promise<EventsSubscriptionSettings> {
  const settings = await getFinancialSettingsFromDb();
  return normalizeEventsSubscription(settings.eventsSubscription);
}

export const resolvePlanFee = resolveDirectoryPlanFee;
