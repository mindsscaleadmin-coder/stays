"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import { DashboardShell } from "./dashboard-shell";
import { ADMIN_NAV } from "./admin-nav";
import {
  getAdminSettingsSidebarNav,
  isAdminSettingsPath,
} from "./admin-settings-shell";
import { ListingControlNavNotice } from "./listing-control-nav-notice";
import { useAdminStaffAccess } from "@/lib/admin/use-admin-staff-access";

const AdminShellMountedContext = createContext(false);

/**
 * Admin chrome (sidebar). Layout owns the real shell; page wrappers pass through.
 * On Settings routes the sidebar switches to settings sections (single sidebar).
 */
export function AdminDashboardShell({ children }: { children: ReactNode }) {
  const alreadyMounted = useContext(AdminShellMountedContext);
  if (alreadyMounted) {
    return <>{children}</>;
  }
  return (
    <AdminShellMountedContext.Provider value={true}>
      <AdminDashboardShellChrome>{children}</AdminDashboardShellChrome>
    </AdminShellMountedContext.Provider>
  );
}

function AdminDashboardShellChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { staff, roleLabel, canAccessPath } = useAdminStaffAccess();
  const inSettings = isAdminSettingsPath(pathname);

  const navItems = useMemo(() => {
    if (inSettings) return getAdminSettingsSidebarNav();

    return ADMIN_NAV.filter((item) => canAccessPath(item.href)).map((item) =>
      item.href === "/admin/listings"
        ? { ...item, Trailing: ListingControlNavNotice }
        : item
    );
  }, [canAccessPath, inSettings]);

  const title = inSettings ? "Settings" : "Admin";
  const subtitle = inSettings
    ? "Platform configuration"
    : staff
      ? `${roleLabel ?? "Staff"} · Platform management`
      : "Platform management";

  return (
    <DashboardShell title={title} subtitle={subtitle} navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
