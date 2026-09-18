import type { DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import type { GuestUser } from "@/lib/auth/types";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import type { HostStaffMember, HostStaffPermission } from "./host-staff-types";
import {
  ALL_HOST_STAFF_PERMISSIONS,
  effectiveHostStaffPermissions,
  hostStaffHasPermission,
} from "./host-staff-types";

/** Map host routes → required permission. */
export const HOST_ROUTE_PERMISSIONS: { prefix: string; permission: HostStaffPermission }[] = [
  { prefix: "/host/bookings", permission: "manage_bookings" },
  { prefix: "/host/check-in-out", permission: "manage_bookings" },
  { prefix: "/host/calendar", permission: "manage_calendar" },
  { prefix: "/host/customers", permission: "manage_bookings" },
  { prefix: "/host/messages", permission: "manage_bookings" },
  { prefix: "/host/reviews", permission: "manage_reviews" },
  { prefix: "/host/notifications", permission: "manage_notifications" },
  { prefix: "/host/staff", permission: "manage_staff" },
  { prefix: "/host/listings", permission: "manage_listings" },
  { prefix: "/host/new-listing", permission: "manage_listings" },
  { prefix: "/host/enquiries", permission: "manage_bookings" },
  { prefix: "/host/event-requests", permission: "manage_bookings" },
  { prefix: "/host/promote", permission: "manage_promote" },
  { prefix: "/host/extra-charges", permission: "manage_extra_charges" },
  { prefix: "/host/house-rules", permission: "manage_house_rules" },
  { prefix: "/host/accounts", permission: "manage_accounts" },
  { prefix: "/host/add-ons", permission: "manage_addons" },
  { prefix: "/host/support", permission: "manage_support" },
  { prefix: "/host/profile", permission: "manage_profile" },
  { prefix: "/host/verify", permission: "manage_profile" },
  { prefix: "/host/analytics", permission: "manage_analytics" },
  { prefix: "/host/pricing", permission: "manage_pricing" },
  { prefix: "/host", permission: "view_overview" },
];

export function isHostOwnerSession(user: GuestUser | null | undefined): boolean {
  return Boolean(user && !user.staffMemberId);
}

export function requiredPermissionForHostPath(pathname: string): HostStaffPermission {
  const path = pathname.replace(/\/$/, "") || "/host";
  const match = HOST_ROUTE_PERMISSIONS.find(
    (route) => path === route.prefix || path.startsWith(`${route.prefix}/`)
  );
  return match?.permission ?? "view_overview";
}

export function canAccessHostPath(
  member: HostStaffMember | null | undefined,
  pathname: string,
  options?: { ownerBypass?: boolean }
): boolean {
  if (options?.ownerBypass) return true;
  const required = requiredPermissionForHostPath(pathname);
  return hostStaffHasPermission(member, required);
}

export function firstAllowedHostPath(member: HostStaffMember): string {
  const ordered = [
    "/host",
    "/host/bookings",
    "/host/check-in-out",
    "/host/calendar",
    "/host/customers",
    "/host/messages",
    "/host/reviews",
    "/host/notifications",
    "/host/listings",
    "/host/enquiries",
    "/host/event-requests",
    "/host/promote",
    "/host/extra-charges",
    "/host/house-rules",
    "/host/accounts",
    "/host/add-ons",
    "/host/support",
    "/host/staff",
    "/host/profile",
  ];
  for (const href of ordered) {
    if (canAccessHostPath(member, href)) return href;
  }
  return "/host";
}

export function resolveHostStaffMember(
  user: GuestUser | null | undefined,
  staffList: HostStaffMember[]
): HostStaffMember | null {
  if (!user) return null;
  const hostId = resolveHostId(user);
  if (!hostId) return null;

  if (user.staffMemberId) {
    const found = staffList.find((row) => row.id === user.staffMemberId);
    if (!found || !found.active) return null;
    return { ...found, permissions: effectiveHostStaffPermissions(found) };
  }

  const ownerRecord = staffList.find(
    (row) =>
      row.role === "owner" &&
      row.email.trim().toLowerCase() === user.email.trim().toLowerCase()
  );
  if (ownerRecord) {
    return { ...ownerRecord, permissions: effectiveHostStaffPermissions(ownerRecord) };
  }

  return {
    id: `owner-${hostId}`,
    hostId,
    name: user.fullName,
    email: user.email.trim().toLowerCase(),
    role: "owner",
    permissions: [...ALL_HOST_STAFF_PERMISSIONS],
    active: true,
    createdAt: "2020-01-01T00:00:00.000Z",
  };
}

export function filterHostNavItems(
  items: DashboardNavItem[],
  canAccessPath: (pathname: string) => boolean
): DashboardNavItem[] {
  const filtered: DashboardNavItem[] = [];

  for (const item of items) {
    if (item.children?.length) {
      const children = filterHostNavItems(item.children, canAccessPath);
      if (children.length === 0) continue;
      filtered.push({ ...item, children });
      continue;
    }
    if (canAccessPath(item.href)) filtered.push(item);
  }

  return filtered;
}

export { hostStaffHasPermission };
