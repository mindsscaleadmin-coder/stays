import type { DirectoryVertical } from "@/lib/admin/events-subscription";
import type { DirectoryBillingStatus } from "./directory-billing-types";
import type { HostPublicProfile } from "./host-profile-types";
import {
  isDirectoryComboActive,
  isEventsSubscriptionActive,
} from "./events-subscription";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_BILLING_GRACE_DAYS = 14;
export const EXPIRING_SOON_DAYS = 30;
export const SUGGESTED_BILLING_MONTHS = 6;

export function parseIso(iso?: string | null): number | null {
  if (!iso?.trim()) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function hasActiveDirectorySubscription(
  profile: Pick<
    HostPublicProfile,
    | "eventsSubscriptionExpiresAt"
    | "diningSubscriptionExpiresAt"
    | "directoryComboExpiresAt"
  > | null
  | undefined,
  vertical: DirectoryVertical,
  now = new Date()
): boolean {
  if (isDirectoryComboActive(profile, now)) return true;
  const expiresAt =
    vertical === "dining"
      ? profile?.diningSubscriptionExpiresAt
      : profile?.eventsSubscriptionExpiresAt;
  return isEventsSubscriptionActive(expiresAt, now);
}

export function isHostInBillingGrace(
  profile: Pick<HostPublicProfile, "directoryBillingGraceEndsAt"> | null | undefined,
  now = new Date()
): boolean {
  const ends = parseIso(profile?.directoryBillingGraceEndsAt);
  if (ends === null) return false;
  return ends > now.getTime();
}

export function effectiveDirectoryExpiry(
  profile: Pick<
    HostPublicProfile,
    | "eventsSubscriptionExpiresAt"
    | "diningSubscriptionExpiresAt"
    | "directoryComboExpiresAt"
  > | null
  | undefined
): string | undefined {
  if (isDirectoryComboActive(profile)) return profile?.directoryComboExpiresAt;
  const events = profile?.eventsSubscriptionExpiresAt;
  const dining = profile?.diningSubscriptionExpiresAt;
  if (events && dining) {
    const e = parseIso(events) ?? 0;
    const d = parseIso(dining) ?? 0;
    return e >= d ? events : dining;
  }
  return events || dining;
}

export function daysUntilExpiry(expiresAt?: string | null, now = new Date()): number | null {
  const ends = parseIso(expiresAt);
  if (ends === null) return null;
  return Math.ceil((ends - now.getTime()) / MS_PER_DAY);
}

export function resolveDirectoryBillingStatus(
  profile: HostPublicProfile | null | undefined,
  now = new Date()
): DirectoryBillingStatus {
  if (profile?.directoryBillingStatus) {
    if (profile.directoryBillingStatus === "active") {
      const expiry = effectiveDirectoryExpiry(profile);
      if (!isEventsSubscriptionActive(expiry, now)) {
        return isHostInBillingGrace(profile, now) ? "grace" : "expired";
      }
      return "active";
    }
    if (profile.directoryBillingStatus === "grace") {
      return isHostInBillingGrace(profile, now) ? "grace" : "expired";
    }
    if (profile.directoryBillingStatus === "pending_payment") {
      if (hasActiveDirectorySubscription(profile, "events", now)) return "active";
      return isHostInBillingGrace(profile, now) ? "grace" : "pending_payment";
    }
    if (profile.directoryBillingStatus === "expired") {
      if (hasActiveDirectorySubscription(profile, "events", now)) return "active";
      return "expired";
    }
  }

  if (!profile?.directoryBillingEnforced) return "launch_free";

  if (
    hasActiveDirectorySubscription(profile, "events", now) ||
    hasActiveDirectorySubscription(profile, "dining", now)
  ) {
    return "active";
  }

  if (isHostInBillingGrace(profile, now)) return "grace";
  return "pending_payment";
}

export function isHostDirectoryPublic(
  profile: HostPublicProfile | null | undefined,
  vertical: DirectoryVertical,
  globalFreeDuringLaunch: boolean,
  now = new Date()
): boolean {
  if (hasActiveDirectorySubscription(profile, vertical, now)) return true;
  if (isHostInBillingGrace(profile, now)) return true;
  if (globalFreeDuringLaunch && !profile?.directoryBillingEnforced) return true;
  return false;
}

export function effectiveFreeDuringLaunchForHost(
  profile: Pick<HostPublicProfile, "directoryBillingEnforced"> | null | undefined,
  globalFreeDuringLaunch: boolean
): boolean {
  return globalFreeDuringLaunch && !profile?.directoryBillingEnforced;
}

export function addGracePeriodIso(days = DEFAULT_BILLING_GRACE_DAYS, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function isSuggestedForBilling(
  joinedAt: string | undefined,
  bookingCount: number,
  profile: HostPublicProfile | null | undefined,
  now = new Date()
): boolean {
  if (profile?.directoryBillingEnforced) return false;
  if (bookingCount > 0) return true;
  const joined = parseIso(joinedAt);
  if (joined === null) return false;
  const months =
    (now.getTime() - joined) / (MS_PER_DAY * 30.4375);
  return months >= SUGGESTED_BILLING_MONTHS;
}

export function billingStatusLabel(status: DirectoryBillingStatus): string {
  switch (status) {
    case "launch_free":
      return "Launch free";
    case "pending_payment":
      return "Payment pending";
    case "grace":
      return "Grace period";
    case "active":
      return "Active paid";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}
