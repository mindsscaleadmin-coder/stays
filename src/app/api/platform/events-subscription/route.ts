import { NextResponse } from "next/server";
import { getFinancialSettingsFromDb } from "@/lib/server/platform-catalog-repo";
import {
  DEFAULT_EVENTS_SUBSCRIPTION,
  eventsDirectoryIsFree,
  getDirectoryPlans,
  normalizeEventsSubscription,
} from "@/lib/admin/events-subscription";

export const dynamic = "force-dynamic";

/**
 * Host/guest-readable slice of directory pricing. Events and Dining each have
 * their own yearly tiers and listing capacity.
 */
export async function GET() {
  try {
    const settings = await getFinancialSettingsFromDb();
    const events = settings.eventsSubscription ?? DEFAULT_EVENTS_SUBSCRIPTION;
    const normalized = normalizeEventsSubscription(events);
    return NextResponse.json({
      freeDuringLaunch: eventsDirectoryIsFree(events),
      eventsPlans: getDirectoryPlans(events, "events").filter((plan) => plan.active),
      diningPlans: getDirectoryPlans(events, "dining").filter((plan) => plan.active),
      comboOffer:
        normalized.comboOffer?.enabled && normalized.comboOffer.active
          ? normalized.comboOffer
          : null,
      /** @deprecated Use eventsPlans / diningPlans */
      plans: getDirectoryPlans(events, "events").filter((plan) => plan.active),
    });
  } catch {
    return NextResponse.json({
      freeDuringLaunch: true,
      eventsPlans: DEFAULT_EVENTS_SUBSCRIPTION.eventsPlans.filter((plan) => plan.active),
      diningPlans: DEFAULT_EVENTS_SUBSCRIPTION.diningPlans.filter((plan) => plan.active),
      comboOffer: DEFAULT_EVENTS_SUBSCRIPTION.comboOffer ?? null,
      plans: DEFAULT_EVENTS_SUBSCRIPTION.eventsPlans.filter((plan) => plan.active),
    });
  }
}
