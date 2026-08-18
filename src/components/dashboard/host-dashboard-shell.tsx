"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DashboardShell } from "./dashboard-shell";
import { HOST_NAV } from "@/lib/host/host-nav";

const HostShellMountedContext = createContext(false);

/**
 * Host chrome (sidebar). Layout owns the real shell; page wrappers pass through.
 * Booking/notification badge hooks removed from the shell to avoid re-loading
 * stores on every navigation and sync event.
 */
export function HostDashboardShell({ children }: { children: ReactNode }) {
  const alreadyMounted = useContext(HostShellMountedContext);
  if (alreadyMounted) {
    return <>{children}</>;
  }
  return (
    <HostShellMountedContext.Provider value={true}>
      <HostDashboardShellChrome>{children}</HostDashboardShellChrome>
    </HostShellMountedContext.Provider>
  );
}

function HostDashboardShellChrome({ children }: { children: ReactNode }) {
  const navItems = useMemo(() => HOST_NAV, []);

  return (
    <DashboardShell title="Host" subtitle="Manage your properties" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
