"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DashboardShell } from "./dashboard-shell";
import { HOST_NAV } from "@/lib/host/host-nav";
import { useAuth } from "@/components/providers/auth-provider";
import { useHostPublicProfile } from "@/lib/host/use-host-public-profile";
import { useHostStaffAccess } from "@/lib/host/use-host-staff-access";
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
  const { user } = useAuth();
  const { filterNavItems, ready, roleLabel, isOwner } = useHostStaffAccess();
  const hostId = resolveHostId(user);
  const { data: profile } = useHostPublicProfile(hostId, user?.fullName ?? "");
  const companyName = profile?.companyName?.trim();

  const navItems = useMemo(() => {
    if (!ready) return HOST_NAV;
    return filterNavItems(HOST_NAV);
  }, [filterNavItems, ready]);

  const subtitle = isOwner
    ? "Manage your properties"
    : roleLabel
      ? `${roleLabel} · Team access`
      : "Team access";

  return (
    <DashboardShell
      title={companyName || "Host"}
      subtitle={subtitle}
      brandLogo={profile?.logoUrl || null}
      tone="host"
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
