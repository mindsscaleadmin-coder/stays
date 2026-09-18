"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "@/i18n/routing";
import {
  DashboardMainColumn,
  DashboardSidebarColumn,
} from "./dashboard-shell";
import { ADMIN_NAV } from "./admin-nav";
import {
  getAdminSettingsSidebarNav,
  isAdminSettingsPath,
} from "./admin-settings-shell";
import { ListingControlNavNotice } from "./listing-control-nav-notice";
import { PendingRefundNavNotice } from "./pending-refund-nav-notice";
import { useAdminStaffAccess } from "@/lib/admin/use-admin-staff-access";

const ADMIN_NAV_WITH_LISTING_NOTICE = ADMIN_NAV.map((item) => {
  if (item.href === "/admin/listings") {
    return { ...item, Trailing: ListingControlNavNotice };
  }
  if (item.href === "/admin/financial") {
    return { ...item, Trailing: PendingRefundNavNotice };
  }
  return item;
});

const ADMIN_EXACT_HREFS = ["/admin"];

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
      <AdminDashboardLayout>{children}</AdminDashboardLayout>
    </AdminShellMountedContext.Provider>
  );
}

function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f3f7f1] lg:flex lg:items-start">
      <AdminSidebar
        pathname={pathname}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={closeSidebar}
      />
      <DashboardMainColumn onOpenSidebar={openSidebar} tone="admin">
        {children}
      </DashboardMainColumn>
    </div>
  );
}

const AdminSidebar = memo(function AdminSidebar({
  pathname,
  sidebarOpen,
  onCloseSidebar,
}: {
  pathname: string;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}) {
  const { staff, roleLabel, canAccessPath, ready } = useAdminStaffAccess();
  const inSettings = isAdminSettingsPath(pathname);

  const navItems = useMemo(() => {
    if (inSettings) return getAdminSettingsSidebarNav();
    if (ready && staff) {
      return ADMIN_NAV_WITH_LISTING_NOTICE.filter((item) => canAccessPath(item.href));
    }
    return ADMIN_NAV_WITH_LISTING_NOTICE;
  }, [canAccessPath, inSettings, ready, staff]);

  const title = inSettings ? "Settings" : "Admin";
  const subtitle = inSettings
    ? "Platform configuration"
    : staff
      ? `${roleLabel ?? "Staff"} · Platform management`
      : "Platform management";

  return (
    <DashboardSidebarColumn
      pathname={pathname}
      title={title}
      subtitle={subtitle}
      tone="admin"
      navItems={navItems}
      exactHrefs={ADMIN_EXACT_HREFS}
      sidebarOpen={sidebarOpen}
      onCloseSidebar={onCloseSidebar}
    />
  );
});
