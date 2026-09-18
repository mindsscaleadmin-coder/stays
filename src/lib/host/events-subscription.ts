/** Host-level directory yearly access — separate subscriptions for Events and Dining. */

import {
  effectiveFreeDuringLaunchForHost,
  hasActiveDirectorySubscription,
  isHostInBillingGrace,
} from "./directory-billing";
import type { HostPublicProfile } from "./host-profile-types";

export type DirectoryVertical = "events" | "dining";

type DirectorySubscriptionProfile = Pick<
  HostPublicProfile,
  | "eventsSubscriptionExpiresAt"
  | "diningSubscriptionExpiresAt"
  | "directoryComboExpiresAt"
  | "directoryBillingEnforced"
  | "directoryBillingGraceEndsAt"
>;

export function isEventsSubscriptionActive(
  expiresAt?: string | null,
  now = new Date()
): boolean {
  if (!expiresAt?.trim()) return false;
  const ends = Date.parse(expiresAt);
  if (!Number.isFinite(ends)) return false;
  return ends > now.getTime();
}

export function isDirectoryComboActive(
  profile: Pick<HostPublicProfile, "directoryComboExpiresAt"> | null | undefined,
  now = new Date()
): boolean {
  return isEventsSubscriptionActive(profile?.directoryComboExpiresAt, now);
}

export function isDirectorySubscriptionActive(
  vertical: DirectoryVertical,
  profile: DirectorySubscriptionProfile | null | undefined,
  freeDuringLaunch = false,
  now = new Date()
): boolean {
  if (hasActiveDirectorySubscription(profile, vertical, now)) return true;
  if (isHostInBillingGrace(profile, now)) return true;
  if (effectiveFreeDuringLaunchForHost(profile, freeDuringLaunch)) return true;
  return false;
}

export function directorySubscriptionExpiry(
  vertical: DirectoryVertical,
  profile:
    | Pick<
        HostPublicProfile,
        | "eventsSubscriptionExpiresAt"
        | "diningSubscriptionExpiresAt"
        | "directoryComboExpiresAt"
      >
    | null
    | undefined
): string | undefined {
  if (isDirectoryComboActive(profile)) {
    return profile?.directoryComboExpiresAt;
  }
  return vertical === "dining"
    ? profile?.diningSubscriptionExpiresAt
    : profile?.eventsSubscriptionExpiresAt;
}

export function addOneYearIso(from = new Date()): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export function formatSubscriptionExpiry(expiresAt?: string | null, locale = "en"): string {
  if (!expiresAt?.trim()) return "";
  const ends = Date.parse(expiresAt);
  if (!Number.isFinite(ends)) return "";
  return new Date(ends).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
