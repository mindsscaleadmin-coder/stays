import type { StaffMember, StaffPermission } from "./staff-types";
import { staffHasPermission } from "./staff-types";
import { getStaffByEmail, loadStaffMembers } from "./staff-data";
import { ALL_STAFF_PERMISSIONS, effectivePermissions } from "./staff-types";

/** Map admin routes → required permission. `null` = any authenticated staff. */
export const ADMIN_ROUTE_PERMISSIONS: { prefix: string; permission: StaffPermission | null }[] = [
  { prefix: "/admin/analytics", permission: "manage_analytics" },
  { prefix: "/admin/listings", permission: "manage_listings" },
  { prefix: "/admin/hosts", permission: "manage_hosts" },
  { prefix: "/admin/roles", permission: "manage_staff" },
  { prefix: "/admin/users", permission: "manage_users" },
  { prefix: "/admin/bookings", permission: "manage_bookings" },
  { prefix: "/admin/support", permission: "manage_support" },
  { prefix: "/admin/alerts", permission: "manage_alerts" },
  { prefix: "/admin/financial", permission: "manage_financial" },
  { prefix: "/admin/trust", permission: "manage_trust" },
  { prefix: "/admin/content", permission: "manage_content" },
  { prefix: "/admin/countries", permission: "manage_settings" },
  { prefix: "/admin/platform", permission: "manage_settings" },
  { prefix: "/admin/settings", permission: "manage_settings" },
  { prefix: "/admin", permission: "view_overview" },
];

export function requiredPermissionForPath(pathname: string): StaffPermission | null {
  const path = pathname.replace(/\/$/, "") || "/admin";
  const match = ADMIN_ROUTE_PERMISSIONS.find(
    (r) => path === r.prefix || path.startsWith(`${r.prefix}/`)
  );
  return match?.permission ?? "view_overview";
}

export function canAccessAdminPath(
  member: StaffMember | null | undefined,
  pathname: string
): boolean {
  const path = pathname.replace(/\/$/, "") || "/admin";
  // Combined Users & Access section
  if (path === "/admin/users" || path.startsWith("/admin/users/")) {
    return (
      staffHasPermission(member, "manage_users") ||
      staffHasPermission(member, "manage_staff")
    );
  }
  // Legacy roles URL redirects here
  if (path === "/admin/roles" || path.startsWith("/admin/roles/")) {
    return staffHasPermission(member, "manage_staff");
  }
  const required = requiredPermissionForPath(pathname);
  if (required === null) return !!member?.active;
  return staffHasPermission(member, required);
}

export function firstAllowedAdminPath(member: StaffMember): string {
  const ordered = [
    "/admin",
    "/admin/support",
    "/admin/content",
    "/admin/bookings",
    "/admin/listings",
    "/admin/hosts",
    "/admin/alerts",
    "/admin/analytics",
    "/admin/users",
    "/admin/trust",
    "/admin/financial",
    "/admin/platform",
    "/admin/settings",
    "/admin/roles",
  ];
  for (const href of ordered) {
    if (canAccessAdminPath(member, href)) return href;
  }
  return "/admin";
}

/**
 * Resolve staff record for a logged-in admin.
 * Known staff emails use their role; unknown emails get a virtual Super Admin
 * (invite-based signup / legacy demo) so they are not locked out.
 */
export function resolveStaffForAdminEmail(email: string): StaffMember | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const existing = getStaffByEmail(normalized);
  if (existing) {
    if (!existing.active) return null;
    return {
      ...existing,
      permissions: effectivePermissions(existing),
    };
  }

  return {
    id: `virtual-${normalized}`,
    name: normalized.split("@")[0] || "Super Admin",
    email: normalized,
    role: "admin",
    permissions: [...ALL_STAFF_PERMISSIONS],
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export function isInactiveStaffEmail(email: string): boolean {
  const staff = loadStaffMembers().find(
    (s) => s.email === email.trim().toLowerCase()
  );
  return !!staff && !staff.active;
}

export { staffHasPermission, effectivePermissions };
