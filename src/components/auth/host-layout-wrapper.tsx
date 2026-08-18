"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import { HostRouteGuard } from "@/components/auth/host-route-guard";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";

const PUBLIC_HOST_PATHS = ["/host/login", "/host/signup"];

function isPublicHostPath(pathname: string): boolean {
  return PUBLIC_HOST_PATHS.some(
    (path) => pathname === path || pathname.endsWith(path)
  );
}

function HostChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isPublicHostPath(pathname)) {
    return <>{children}</>;
  }
  return <HostDashboardShell>{children}</HostDashboardShell>;
}

export function HostLayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <HostRouteGuard>
      <HostChrome>{children}</HostChrome>
    </HostRouteGuard>
  );
}
