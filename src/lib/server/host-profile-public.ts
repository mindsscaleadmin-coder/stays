import type { HostPublicProfile } from "@/lib/host/host-profile-types";

/** Guest-safe host profile fields (unauthenticated listing surfaces). */
export type HostGuestVisibleProfile = Pick<
  HostPublicProfile,
  | "hostId"
  | "displayName"
  | "companyName"
  | "bio"
  | "city"
  | "logoUrl"
  | "logoFileName"
  | "logoBytes"
  | "logoWidth"
  | "logoHeight"
  | "instantBookEnabled"
>;

export function toGuestVisibleHostProfile(profile: HostPublicProfile): HostGuestVisibleProfile {
  return {
    hostId: profile.hostId,
    displayName: profile.displayName,
    companyName: profile.companyName,
    bio: profile.bio,
    city: profile.city,
    logoUrl: profile.logoUrl,
    logoFileName: profile.logoFileName,
    logoBytes: profile.logoBytes,
    logoWidth: profile.logoWidth,
    logoHeight: profile.logoHeight,
    instantBookEnabled: profile.instantBookEnabled,
  };
}
