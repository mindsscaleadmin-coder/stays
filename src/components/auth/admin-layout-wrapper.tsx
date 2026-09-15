"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import { AdminRouteGuard } from "@/components/auth/admin-route-guard";
import { AdminDashboardShell } from "@/components/dashboard/admin-dashboard-shell";
import { AdminStaffAccessProvider } from "@/lib/admin/use-admin-staff-access";
import { useListingSubmissions } from "@/lib/listings/use-listing-submissions";

const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/admin/signup",
  "/admin/forgot-password",
  "/admin/reset-password",
];

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.endsWith(path)
  );
}

/**
 * Layout-owned admin chrome. Settings keeps an inner subnav via settings/layout,
 * but the main Admin sidebar stays mounted so nav never disappears.
 */
function AdminListingsPreload() {
  const { ensureLoaded } = useListingSubmissions();
  useLayoutEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  return null;
}

function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isPublicAdminPath(pathname)) {
    return <>{children}</>;
  }
  return (
    <AdminDashboardShell>
      <AdminListingsPreload />
      {children}
    </AdminDashboardShell>
  );
}

export function AdminLayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <AdminStaffAccessProvider>
      <AdminChrome>
        <AdminRouteGuard>{children}</AdminRouteGuard>
      </AdminChrome>
    </AdminStaffAccessProvider>
  );
}
