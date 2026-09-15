"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
import { STAFF_ROLE_LABELS, effectivePermissions } from "@/lib/admin/staff-types";

function useAdminStaffAccessState() {
  const { user, isAdmin } = useAuth();
  const [tick, setTick] = useState(0);
  const [apiStaff, setApiStaff] = useState<StaffMember | null | undefined>(undefined);
  const shared = shouldUseSharedAdminStaff();
  const email = user?.email;

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-admin-staff") refresh();
    }
    window.addEventListener(STAFF_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STAFF_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!shared || !email || !isAdmin) {
      setApiStaff(undefined);
      return;
    }
    let cancelled = false;
    void fetchAdminStaffByEmailFromApi(email)
      .then((member) => {
        if (cancelled) return;
        if (member && !member.active) {
          setApiStaff(null);
          return;
        }
        if (member) {
          const next = { ...member, permissions: effectivePermissions(member) };
          setApiStaff((prev) =>
            prev &&
            prev.id === next.id &&
            prev.role === next.role &&
            prev.active === next.active
              ? prev
              : next
          );
          return;
        }
        setApiStaff(undefined);
      })
      .catch(() => {
        if (!cancelled) setApiStaff(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [shared, email, isAdmin, tick]);

  const staff: StaffMember | null = useMemo(() => {
    if (!user || !isAdmin) return null;
    if (shared && apiStaff === null) return null;
    if (shared && apiStaff) return apiStaff;
    return resolveStaffForAdminEmail(user.email);
  }, [user, isAdmin, shared, apiStaff]);

  // Stale-while-revalidate: local staff is enough to render nav; API refines permissions.
  const ready = !isAdmin || !user || !shared || apiStaff !== undefined || !!staff;

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
    ready,
    roleLabel: staff ? STAFF_ROLE_LABELS[staff.role] : null,
    isSuperAdmin: staff?.role === "admin",
    can,
    canAccessPath,
    homePath,
  };
}

type AdminStaffAccessValue = ReturnType<typeof useAdminStaffAccessState>;

const AdminStaffAccessContext = createContext<AdminStaffAccessValue | null>(null);

export function AdminStaffAccessProvider({ children }: { children: ReactNode }) {
  const value = useAdminStaffAccessState();
  return (
    <AdminStaffAccessContext.Provider value={value}>{children}</AdminStaffAccessContext.Provider>
  );
}

export function useAdminStaffAccess() {
  const ctx = useContext(AdminStaffAccessContext);
  if (!ctx) {
    throw new Error("useAdminStaffAccess must be used within AdminStaffAccessProvider");
  }
  return ctx;
}
