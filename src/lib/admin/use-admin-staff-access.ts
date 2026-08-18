"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  canAccessAdminPath,
  firstAllowedAdminPath,
  resolveStaffForAdminEmail,
  staffHasPermission,
} from "@/lib/admin/staff-access";
import { STAFF_SYNC_EVENT } from "@/lib/admin/staff-data";
import {
  fetchAdminStaffByEmailFromApi,
  shouldUseSharedAdminStaff,
} from "@/lib/admin/staff-api";
import type { StaffMember, StaffPermission } from "@/lib/admin/staff-types";
import { ALL_STAFF_PERMISSIONS, STAFF_ROLE_LABELS, effectivePermissions } from "@/lib/admin/staff-types";

function virtualSuperAdmin(email: string): StaffMember {
  const normalized = email.trim().toLowerCase();
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

export function useAdminStaffAccess() {
  const { user, isAdmin } = useAuth();
  const [tick, setTick] = useState(0);
  const [apiStaff, setApiStaff] = useState<StaffMember | null | undefined>(undefined);
  const shared = shouldUseSharedAdminStaff();

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(STAFF_SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(STAFF_SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!shared || !user || !isAdmin) {
      setApiStaff(undefined);
      return;
    }
    let cancelled = false;
    void fetchAdminStaffByEmailFromApi(user.email)
      .then((member) => {
        if (cancelled) return;
        if (member && !member.active) {
          setApiStaff(null);
          return;
        }
        if (member) {
          setApiStaff({ ...member, permissions: effectivePermissions(member) });
          return;
        }
        setApiStaff(virtualSuperAdmin(user.email));
      })
      .catch(() => {
        if (!cancelled) setApiStaff(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [shared, user, isAdmin, tick]);

  const staff: StaffMember | null = useMemo(() => {
    void tick;
    if (!user || !isAdmin) return null;
    if (shared && apiStaff !== undefined) return apiStaff;
    return resolveStaffForAdminEmail(user.email);
  }, [user, isAdmin, tick, shared, apiStaff]);

  const can = useCallback(
    (permission: StaffPermission) => staffHasPermission(staff, permission),
    [staff]
  );

  const canAccessPath = useCallback(
    (pathname: string) => canAccessAdminPath(staff, pathname),
    [staff]
  );

  const homePath = staff ? firstAllowedAdminPath(staff) : "/admin/login";

  return {
    staff,
    roleLabel: staff ? STAFF_ROLE_LABELS[staff.role] : null,
    isSuperAdmin: staff?.role === "admin",
    can,
    canAccessPath,
    homePath,
  };
}
