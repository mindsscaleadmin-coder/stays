"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import {
  canAccessHostPath,
  filterHostNavItems,
  firstAllowedHostPath,
  hostStaffHasPermission,
  isHostOwnerSession,
  resolveHostStaffMember,
} from "@/lib/host/host-staff-access";
import { useHostStaff } from "@/lib/host/use-host-staff";
import {
  HOST_STAFF_ROLE_LABELS,
  type HostStaffMember,
  type HostStaffPermission,
} from "@/lib/host/host-staff-types";

function useHostStaffAccessState() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { staff, ready: staffReady } = useHostStaff(
    hostId,
    user ? { name: user.fullName, email: user.email } : null
  );

  const isOwner = isHostOwnerSession(user);
  const member: HostStaffMember | null = useMemo(
    () => resolveHostStaffMember(user, staff),
    [user, staff]
  );

  const ready = !user || !hostId || staffReady || isOwner;

  const can = useCallback(
    (permission: HostStaffPermission) => {
      if (isOwner) return true;
      return hostStaffHasPermission(member, permission);
    },
    [isOwner, member]
  );

  const canAccessPath = useCallback(
    (pathname: string) => canAccessHostPath(member, pathname, { ownerBypass: isOwner }),
    [isOwner, member]
  );

  const homePath = member ? firstAllowedHostPath(member) : "/host";

  const filterNavItems = useCallback(
    (items: DashboardNavItem[]) => filterHostNavItems(items, canAccessPath),
    [canAccessPath]
  );

  return useMemo(
    () => ({
      member,
      ready,
      isOwner,
      roleLabel: member ? HOST_STAFF_ROLE_LABELS[member.role] : null,
      can,
      canAccessPath,
      homePath,
      filterNavItems,
    }),
    [member, ready, isOwner, can, canAccessPath, homePath, filterNavItems]
  );
}

type HostStaffAccessValue = ReturnType<typeof useHostStaffAccessState>;

const HostStaffAccessContext = createContext<HostStaffAccessValue | null>(null);

export function HostStaffAccessProvider({ children }: { children: ReactNode }) {
  const value = useHostStaffAccessState();
  return (
    <HostStaffAccessContext.Provider value={value}>{children}</HostStaffAccessContext.Provider>
  );
}

export function useHostStaffAccess() {
  const ctx = useContext(HostStaffAccessContext);
  if (!ctx) {
    throw new Error("useHostStaffAccess must be used within HostStaffAccessProvider");
  }
  return ctx;
}
