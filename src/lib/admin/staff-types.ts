/** Staff roles for the admin console (separate from marketplace guest/host/admin). */
export type StaffRole = "admin" | "sub_admin" | "support";

export type StaffPermission =
  | "view_overview"
  | "manage_hosts"
  | "approve_kyc"
  | "suspend_hosts"
  | "edit_host_profiles"
  | "impersonate_hosts"
  | "manage_listings"
  | "manage_bookings"
  | "manage_users"
  | "manage_support"
  | "manage_content"
  | "manage_financial"
  | "manage_trust"
  | "manage_alerts"
  | "manage_analytics"
  | "manage_settings"
  | "manage_staff";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: StaffPermission[];
  active: boolean;
  /** Masked in API responses. Stored hashed on the server. */
  password?: string;
  createdAt: string;
}

export type StaffMemberInput = Omit<StaffMember, "id" | "createdAt"> & {
  id?: string;
  /** Pass to set/replace password; omit to keep existing. Empty string clears. */
  password?: string;
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Super Admin",
  sub_admin: "Sub-admin",
  support: "Support staff",
};

export const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  view_overview: "View overview",
  manage_hosts: "Manage hosts",
  approve_kyc: "Approve/reject KYC",
  suspend_hosts: "Suspend / ban hosts",
  edit_host_profiles: "Edit host profiles",
  impersonate_hosts: "Impersonate hosts",
  manage_listings: "Manage listings",
  manage_bookings: "Manage bookings",
  manage_users: "Manage users",
  manage_support: "Support & disputes",
  manage_content: "Content & policy",
  manage_financial: "Financial control",
  manage_trust: "Reviews & trust",
  manage_alerts: "Notifications & alerts",
  manage_analytics: "Analytics dashboard",
  manage_settings: "Platform & settings",
  manage_staff: "Manage staff roles",
};

export const ALL_STAFF_PERMISSIONS = Object.keys(
  STAFF_PERMISSION_LABELS
) as StaffPermission[];

export const DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  admin: [...ALL_STAFF_PERMISSIONS],
  sub_admin: [
    "view_overview",
    "manage_hosts",
    "approve_kyc",
    "suspend_hosts",
    "edit_host_profiles",
    "manage_listings",
    "manage_bookings",
    "manage_users",
    "manage_support",
    "manage_content",
    "manage_trust",
    "manage_alerts",
    "manage_analytics",
  ],
  support: [
    "view_overview",
    "manage_hosts",
    "approve_kyc",
    "manage_bookings",
    "manage_support",
    "manage_content",
    "manage_alerts",
  ],
};

export function normalizeStaffPermissions(
  role: StaffRole,
  permissions: StaffPermission[]
): StaffPermission[] {
  if (role === "admin") return [...ALL_STAFF_PERMISSIONS];
  const allowed = new Set(ALL_STAFF_PERMISSIONS);
  const cleaned = permissions.filter((p) => allowed.has(p));
  if (cleaned.length === 0) return [...DEFAULT_PERMISSIONS[role]];

  // Upgrade older records that predate newer permission keys
  const defaults = DEFAULT_PERMISSIONS[role];
  const upgradeKeys: StaffPermission[] = [
    "view_overview",
    "manage_support",
    "manage_content",
    "manage_users",
    "manage_trust",
    "manage_alerts",
    "manage_analytics",
  ];
  if (!cleaned.includes("view_overview")) {
    const merged = new Set(cleaned);
    for (const key of upgradeKeys) {
      if (defaults.includes(key)) merged.add(key);
    }
    return Array.from(merged);
  }
  return cleaned;
}

export function effectivePermissions(member: Pick<StaffMember, "role" | "permissions" | "active">): StaffPermission[] {
  if (!member.active) return [];
  return normalizeStaffPermissions(member.role, member.permissions);
}

export function staffHasPermission(
  member: Pick<StaffMember, "role" | "permissions" | "active"> | null | undefined,
  permission: StaffPermission
): boolean {
  if (!member || !member.active) return false;
  return effectivePermissions(member).includes(permission);
}
