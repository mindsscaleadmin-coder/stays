import type { HostPublicProfile, HostPublicProfileInput } from "./host-profile-types";

/** Merge subscription + billing fields from input onto stored profile. */
export function mergeHostProfileSubscriptionFields(
  input: HostPublicProfileInput,
  stored: Omit<HostPublicProfile, "hostId"> | null
): Pick<
  HostPublicProfile,
  | "eventsSubscriptionExpiresAt"
  | "diningSubscriptionExpiresAt"
  | "directoryComboExpiresAt"
  | "eventsVenueSpaces"
  | "eventsHallSpaces"
  | "diningOutletSpaces"
  | "directoryBillingEnforced"
  | "directoryBillingStatus"
  | "preferredDirectoryPlanId"
  | "directoryBillingEnabledAt"
  | "directoryBillingPaidAt"
  | "directoryBillingNotes"
  | "directoryBillingGraceEndsAt"
> {
  return {
    eventsSubscriptionExpiresAt:
      input.eventsSubscriptionExpiresAt !== undefined
        ? input.eventsSubscriptionExpiresAt?.trim() || undefined
        : stored?.eventsSubscriptionExpiresAt,
    diningSubscriptionExpiresAt:
      input.diningSubscriptionExpiresAt !== undefined
        ? input.diningSubscriptionExpiresAt?.trim() || undefined
        : stored?.diningSubscriptionExpiresAt,
    directoryComboExpiresAt:
      input.directoryComboExpiresAt !== undefined
        ? input.directoryComboExpiresAt?.trim() || undefined
        : stored?.directoryComboExpiresAt,
    eventsVenueSpaces:
      input.eventsVenueSpaces !== undefined
        ? input.eventsVenueSpaces
        : stored?.eventsVenueSpaces,
    eventsHallSpaces:
      input.eventsHallSpaces !== undefined
        ? input.eventsHallSpaces
        : stored?.eventsHallSpaces,
    diningOutletSpaces:
      input.diningOutletSpaces !== undefined
        ? input.diningOutletSpaces
        : stored?.diningOutletSpaces,
    directoryBillingEnforced:
      input.directoryBillingEnforced !== undefined
        ? input.directoryBillingEnforced
        : stored?.directoryBillingEnforced,
    directoryBillingStatus:
      input.directoryBillingStatus !== undefined
        ? input.directoryBillingStatus
        : stored?.directoryBillingStatus,
    preferredDirectoryPlanId:
      input.preferredDirectoryPlanId !== undefined
        ? input.preferredDirectoryPlanId?.trim() || undefined
        : stored?.preferredDirectoryPlanId,
    directoryBillingEnabledAt:
      input.directoryBillingEnabledAt !== undefined
        ? input.directoryBillingEnabledAt?.trim() || undefined
        : stored?.directoryBillingEnabledAt,
    directoryBillingPaidAt:
      input.directoryBillingPaidAt !== undefined
        ? input.directoryBillingPaidAt?.trim() || undefined
        : stored?.directoryBillingPaidAt,
    directoryBillingNotes:
      input.directoryBillingNotes !== undefined
        ? input.directoryBillingNotes
        : stored?.directoryBillingNotes,
    directoryBillingGraceEndsAt:
      input.directoryBillingGraceEndsAt !== undefined
        ? input.directoryBillingGraceEndsAt?.trim() || undefined
        : stored?.directoryBillingGraceEndsAt,
  };
}
