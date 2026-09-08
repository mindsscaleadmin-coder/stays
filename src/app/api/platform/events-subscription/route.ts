import { NextResponse } from "next/server";
import { getFinancialSettingsFromDb } from "@/lib/server/platform-catalog-repo";
import {
  DEFAULT_EVENTS_SUBSCRIPTION,
  eventsDirectoryIsFree,
} from "@/lib/admin/events-subscription";

export const dynamic = "force-dynamic";

/**
 * Host/guest-readable slice of the Events directory pricing. Admin-only fields
 * (payouts, refunds, commission) stay behind /api/admin/financial.
 */
export async function GET() {
  try {
    const settings = await getFinancialSettingsFromDb();
    const events = settings.eventsSubscription ?? DEFAULT_EVENTS_SUBSCRIPTION;
    return NextResponse.json({
      freeDuringLaunch: eventsDirectoryIsFree(events),
      plans: (events.plans ?? []).filter((plan) => plan.active),
    });
  } catch {
    return NextResponse.json({
      freeDuringLaunch: true,
      plans: DEFAULT_EVENTS_SUBSCRIPTION.plans,
    });
  }
}
