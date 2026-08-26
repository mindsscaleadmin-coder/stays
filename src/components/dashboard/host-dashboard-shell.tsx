"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DashboardShell } from "./dashboard-shell";
import { HOST_NAV } from "@/lib/host/host-nav";
import { useAuth } from "@/components/providers/auth-provider";
import { useHostPublicProfile } from "@/lib/host/use-host-public-profile";
import { resolveHostId } from "@/lib/listings/host-listings-utils";

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
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { data: profile } = useHostPublicProfile(hostId, user?.fullName ?? "");
  const companyName = profile?.companyName?.trim();

  return (
    <DashboardShell
      title={companyName || "Host"}
      subtitle="Manage your properties"
      brandLogo={profile?.logoUrl || null}
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
