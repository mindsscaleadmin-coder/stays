import {
  eventsDirectoryIsFree,
  getDirectoryPlans,
  normalizeEventsSubscription,
  resolveDirectoryPlanForListingCount,
  type DirectoryVertical,
} from "@/lib/admin/events-subscription";
import type { EventsSubscriptionSettings } from "@/lib/admin/financial-types";
import type { HostPublicProfile } from "./host-profile-types";
import { effectiveFreeDuringLaunchForHost } from "./directory-billing";
import {
  directorySubscriptionExpiry,
  formatSubscriptionExpiry,
  isDirectoryComboActive,
  isDirectorySubscriptionActive,
} from "./events-subscription";

export interface DirectorySpaceStatus {
  vertical: DirectoryVertical;
  used: number;
  /** null = unlimited */
  cap: number | null;
  remaining: number | null;
  subscriptionActive: boolean;
  atCapacity: boolean;
}

function verticalSpaceOverride(
  vertical: DirectoryVertical,
  profile: Pick<HostPublicProfile, "eventsVenueSpaces" | "diningOutletSpaces"> | null | undefined
): number | null | undefined {
  return vertical === "dining" ? profile?.diningOutletSpaces : profile?.eventsVenueSpaces;
}

/** Effective space cap for a host in one vertical. null = unlimited. */
export function resolveDirectorySpaceCap(
  vertical: DirectoryVertical,
  profile: HostPublicProfile | null | undefined,
  settings: Partial<EventsSubscriptionSettings> | undefined,
  listingCount = 1
): number | null {
  const normalized = normalizeEventsSubscription(settings);
  const override = verticalSpaceOverride(vertical, profile);
  if (override !== undefined && override !== null) {
    return override <= 0 ? null : Math.max(1, Math.round(override));
  }

  if (isDirectoryComboActive(profile) && normalized.comboOffer?.enabled && normalized.comboOffer.active) {
    const comboCap =
      vertical === "dining"
        ? normalized.comboOffer.diningSpaces
        : normalized.comboOffer.eventsSpaces;
    return comboCap === null || comboCap === undefined || comboCap <= 0
      ? null
      : Math.max(1, Math.round(comboCap));
  }

  const plan = resolveDirectoryPlanForListingCount(
    normalized,
    Math.max(1, listingCount),
    vertical
  );
  return plan?.maxListings ?? null;
}

export function getDirectorySpaceStatus(
  vertical: DirectoryVertical,
  used: number,
  profile: HostPublicProfile | null | undefined,
  settings: Partial<EventsSubscriptionSettings> | undefined,
  freeDuringLaunch = eventsDirectoryIsFree(
    settings ? { freeDuringLaunch: settings.freeDuringLaunch !== false } : undefined
  )
): DirectorySpaceStatus {
  const subscriptionActive = isDirectorySubscriptionActive(vertical, profile, freeDuringLaunch);
  const cap = resolveDirectorySpaceCap(vertical, profile, settings, Math.max(used, 1));
  const remaining = cap === null ? null : Math.max(0, cap - used);
  const atCapacity = cap !== null && used >= cap;

  return {
    vertical,
    used,
    cap,
    remaining,
    subscriptionActive,
    atCapacity,
  };
}

export function formatDirectorySpaceCap(cap: number | null, vertical: DirectoryVertical): string {
  const unit = vertical === "dining" ? "outlet" : "venue";
  if (cap === null) return `Unlimited ${unit}s`;
  if (cap === 1) return `1 ${unit}`;
  return `${cap} ${unit}s`;
}

export function directorySpaceLimitMessage(
  vertical: DirectoryVertical,
  status: DirectorySpaceStatus
): string {
  const label = vertical === "dining" ? "Dining" : "Events";
  const unit = vertical === "dining" ? "outlet" : "venue";
  if (!status.subscriptionActive) {
    return `${label} directory listings need an active yearly subscription before you can add another ${unit}.`;
  }
  if (status.cap === null) return "";
  return `You've reached your ${label} space limit (${status.used}/${status.cap} ${unit}${status.cap === 1 ? "" : "s"}). Upgrade your plan or ask admin to increase your spaces.`;
}

export function canAddDirectoryListing(input: {
  vertical: DirectoryVertical;
  currentCount: number;
  profile: HostPublicProfile | null | undefined;
  settings: Partial<EventsSubscriptionSettings> | undefined;
  freeDuringLaunch?: boolean;
}): { allowed: boolean; status: DirectorySpaceStatus; message?: string } {
  const freeDuringLaunch =
    input.freeDuringLaunch ??
    eventsDirectoryIsFree(
      input.settings
        ? { freeDuringLaunch: input.settings.freeDuringLaunch !== false }
        : undefined
    );
  const status = getDirectorySpaceStatus(
    input.vertical,
    input.currentCount,
    input.profile,
    input.settings,
    freeDuringLaunch
  );

  if (effectiveFreeDuringLaunchForHost(input.profile, freeDuringLaunch)) {
    return { allowed: true, status };
  }

  if (!status.subscriptionActive) {
    return {
      allowed: false,
      status,
      message: directorySpaceLimitMessage(input.vertical, status),
    };
  }

  if (status.cap !== null && input.currentCount >= status.cap) {
    return {
      allowed: false,
      status,
      message: directorySpaceLimitMessage(input.vertical, status),
    };
  }

  return { allowed: true, status };
}

/** Suggested tier cap when granting a subscription from current listing count. */
export function suggestedGrantSpaces(
  vertical: DirectoryVertical,
  listingCount: number,
  settings: Partial<EventsSubscriptionSettings> | undefined
): number | null {
  const plan = resolveDirectoryPlanForListingCount(
    normalizeEventsSubscription(settings),
    Math.max(1, listingCount),
    vertical
  );
  return plan?.maxListings ?? null;
}

export function comboOfferSavings(
  settings: Partial<EventsSubscriptionSettings> | undefined
): number | null {
  const normalized = normalizeEventsSubscription(settings);
  const combo = normalized.comboOffer;
  if (!combo?.enabled || !combo.active) return null;
  const eventsEntry = getDirectoryPlans(normalized, "events").find((plan) => plan.active);
  const diningEntry = getDirectoryPlans(normalized, "dining").find((plan) => plan.active);
  if (!eventsEntry || !diningEntry) return null;
  const separate = eventsEntry.yearlyFeeAed + diningEntry.yearlyFeeAed;
  return Math.max(0, separate - combo.yearlyFeeAed);
}

export function formatDirectorySubscriptionSummary(
  vertical: DirectoryVertical,
  profile: HostPublicProfile | null | undefined,
  freeDuringLaunch: boolean
): string {
  if (freeDuringLaunch) return "Free during launch";
  if (isDirectoryComboActive(profile)) {
    const expiry = formatSubscriptionExpiry(profile?.directoryComboExpiresAt);
    return expiry ? `Combo active until ${expiry}` : "Combo active";
  }
  const expiry = formatSubscriptionExpiry(directorySubscriptionExpiry(vertical, profile));
  return expiry ? `Active until ${expiry}` : "Subscription required";
}
