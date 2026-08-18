/** Staff roles for a host account team (separate from marketplace guest/host/admin). */
export type HostStaffRole = "owner" | "manager" | "staff";

export type HostStaffPermission =
  | "view_overview"
  | "manage_profile"
  | "manage_listings"
  | "manage_pricing"
  | "manage_promote"
  | "manage_bookings"
  | "manage_calendar"
  | "manage_accounts"
  | "manage_reviews"
  | "manage_analytics"
  | "manage_addons"
  | "manage_notifications"
  | "manage_support"
  | "manage_house_rules"
  | "manage_extra_charges"
  | "manage_staff";

export interface HostStaffMember {
  id: string;
  hostId: string;
  name: string;
  email: string;
  role: HostStaffRole;
  permissions: HostStaffPermission[];
  active: boolean;
  /** Demo login password set by the owner (plain text for local demo only). */
  password?: string;
  createdAt: string;
}

export type HostStaffMemberInput = Omit<HostStaffMember, "id" | "createdAt" | "hostId"> & {
  id?: string;
  hostId: string;
  /** Pass to set/replace password; omit to keep existing. Empty string clears. */
  password?: string;
};

export const HOST_STAFF_ROLE_LABELS: Record<HostStaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

export const HOST_STAFF_PERMISSION_LABELS: Record<HostStaffPermission, string> = {
  view_overview: "View overview",
  manage_profile: "Manage profile & verification",
  manage_listings: "Manage listings",
  manage_pricing: "Manage pricing",
  manage_promote: "Promote listings",
  manage_bookings: "Manage bookings",
  manage_calendar: "Calendar & availability",
  manage_accounts: "Payouts & accounts",
  manage_reviews: "Reviews & reputation",
  manage_analytics: "Analytics",
  manage_addons: "Farm add-ons",
  manage_notifications: "Notifications",
  manage_support: "Support",
  manage_house_rules: "House rules & policies",
  manage_extra_charges: "Extra charges",
  manage_staff: "Manage user / staff",
};

export const ALL_HOST_STAFF_PERMISSIONS = Object.keys(
  HOST_STAFF_PERMISSION_LABELS
) as HostStaffPermission[];

export const DEFAULT_HOST_STAFF_PERMISSIONS: Record<HostStaffRole, HostStaffPermission[]> = {
  owner: [...ALL_HOST_STAFF_PERMISSIONS],
  manager: [
    "view_overview",
    "manage_profile",
    "manage_listings",
    "manage_pricing",
    "manage_promote",
    "manage_bookings",
    "manage_calendar",
    "manage_reviews",
    "manage_analytics",
    "manage_addons",
    "manage_notifications",
    "manage_support",
    "manage_house_rules",
    "manage_extra_charges",
  ],
  staff: [
    "view_overview",
    "manage_listings",
    "manage_bookings",
    "manage_calendar",
    "manage_notifications",
    "manage_support",
  ],
};

export function normalizeHostStaffPermissions(
  role: HostStaffRole,
  permissions: HostStaffPermission[]
): HostStaffPermission[] {
  if (role === "owner") return [...ALL_HOST_STAFF_PERMISSIONS];
  const allowed = new Set(ALL_HOST_STAFF_PERMISSIONS);
  const cleaned = permissions.filter((p) => allowed.has(p));
  if (cleaned.length === 0) return [...DEFAULT_HOST_STAFF_PERMISSIONS[role]];
  return cleaned;
}

export function effectiveHostStaffPermissions(
  member: Pick<HostStaffMember, "role" | "permissions" | "active">
): HostStaffPermission[] {
  if (!member.active) return [];
  return normalizeHostStaffPermissions(member.role, member.permissions);
}

export function hostStaffHasPermission(
  member: Pick<HostStaffMember, "role" | "permissions" | "active"> | null | undefined,
  permission: HostStaffPermission
): boolean {
  if (!member || !member.active) return false;
  return effectiveHostStaffPermissions(member).includes(permission);
}
